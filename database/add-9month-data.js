const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tekstil_dss_yeni',
    port: process.env.DB_PORT || 3306
});

const promisePool = pool.promise();

async function add9MonthData() {
    try {
        console.log('📊 9 aylık ihracat verileri ekleniyor...\n');
        
        // Mevcut kayıtları kontrol et
        const [existing] = await promisePool.query(`
            SELECT fabrika_id, departman_adi, veri_donemi, hedef_sevkiyat_miktari, gerceklesen_sevkiyat_miktari
            FROM tekstil_dss_yeni.ihracat_verileri
            ORDER BY fabrika_id, departman_adi
        `);
        
        if (existing.length === 0) {
            console.log('⚠️  Mevcut kayıt bulunamadı. Önce temel verileri ekleyin.');
            process.exit(0);
        }
        
        // Her fabrika-departman için 9 aylık veri oluştur
        const [factories] = await promisePool.query('SELECT fabrika_id FROM tekstil_dss_yeni.fabrikalar ORDER BY fabrika_id');
        const departments = ['kot', 'penye', 'pamuklu'];
        
        let addedCount = 0;
        
        for (const factory of factories) {
            for (const dept of departments) {
                // Mevcut kaydı bul (varsa)
                const existingRecord = existing.find(r => r.fabrika_id === factory.fabrika_id && r.departman_adi === dept);
                
                // Her ay için kayıt oluştur (Ocak-Eylül 2024)
                for (let month = 1; month <= 9; month++) {
                    const date = `2024-${String(month).padStart(2, '0')}-01`;
                    
                    // Bu dönem için kayıt var mı kontrol et
                    const [check] = await promisePool.query(`
                        SELECT COUNT(*) as count 
                        FROM tekstil_dss_yeni.ihracat_verileri 
                        WHERE fabrika_id = ? AND departman_adi = ? AND veri_donemi = ?
                    `, [factory.fabrika_id, dept, date]);
                    
                    if (check[0].count > 0) {
                        continue; // Zaten var, atla
                    }
                    
                    // Hedef ve gerçekleşen miktarları hesapla
                    let targetQty, shippedQty;
                    
                    if (existingRecord) {
                        // Mevcut kayıttan yola çıkarak aylık değerler hesapla
                        const monthlyTarget = Math.floor(existingRecord.hedef_sevkiyat_miktari / 9);
                        const monthlyShipped = Math.floor(existingRecord.gerceklesen_sevkiyat_miktari / 9);
                        
                        // Aylara göre değişkenlik ekle (%80-110 arası)
                        const variation = 0.8 + (Math.random() * 0.3);
                        targetQty = Math.floor(monthlyTarget * variation);
                        shippedQty = Math.floor(monthlyShipped * variation);
                    } else {
                        // Varsayılan değerler
                        const baseTargets = { kot: 20000, penye: 17500, pamuklu: 12500 };
                        const baseShipped = { kot: 18000, penye: 16000, pamuklu: 11500 };
                        
                        const variation = 0.8 + (Math.random() * 0.3);
                        targetQty = Math.floor((baseTargets[dept] || 15000) / 9 * variation);
                        shippedQty = Math.floor((baseShipped[dept] || 14000) / 9 * variation);
                    }
                    
                    // Gecikme, kalite ve şikayet oranları
                    const delayDays = Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0;
                    const qualityRate = 92 + (Math.random() * 6);
                    const complaintRate = Math.random() * 3;
                    
                    await promisePool.query(`
                        INSERT INTO tekstil_dss_yeni.ihracat_verileri 
                        (fabrika_id, departman_adi, veri_donemi, hedef_sevkiyat_miktari, gerceklesen_sevkiyat_miktari, 
                         sevkiyat_gecikmeleri_gun, kalite_kontrol_gecis_yuzde, musteri_sikayet_sayisi)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [factory.fabrika_id, dept, date, targetQty, shippedQty, delayDays, qualityRate.toFixed(2), complaintRate.toFixed(2)]);
                    
                    addedCount++;
                }
            }
        }
        
        console.log(`✅ ${addedCount} yeni kayıt eklendi.\n`);
        
        // Sonuç kontrolü
        const [summary] = await promisePool.query(`
            SELECT 
                f.fabrika_adi,
                iv.departman_adi,
                COUNT(*) as count
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            GROUP BY f.fabrika_adi, iv.departman_adi
            ORDER BY f.fabrika_adi, iv.departman_adi
        `);
        
        console.log('📊 Güncel durum (Fabrika-Departman bazlı):');
        summary.forEach(r => {
            console.log(`  ${r.fabrika_adi} - ${r.departman_adi}: ${r.count} kayıt`);
        });
        
        const [total] = await promisePool.query(`
            SELECT COUNT(*) as total FROM tekstil_dss_yeni.ihracat_verileri
        `);
        console.log(`\n✅ Toplam ${total[0].total} kayıt var.`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

add9MonthData();

