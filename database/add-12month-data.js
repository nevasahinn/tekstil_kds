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

async function add12MonthData() {
    try {
        console.log('📊 12 aylık veri kontrolü ve eksik ayların eklenmesi...\n');
        
        // Mevcut kayıtları kontrol et
        const [existing] = await promisePool.query(`
            SELECT fabrika_id, departman_adi, veri_donemi, hedef_sevkiyat_miktari, gerceklesen_sevkiyat_miktari
            FROM tekstil_dss_yeni.ihracat_verileri
            ORDER BY fabrika_id, departman_adi, veri_donemi
        `);
        
        if (existing.length === 0) {
            console.log('⚠️  Mevcut kayıt bulunamadı. Önce temel verileri ekleyin.');
            process.exit(0);
        }
        
        // Her fabrika-departman için 12 aylık veri oluştur
        const [factories] = await promisePool.query('SELECT fabrika_id FROM tekstil_dss_yeni.fabrikalar ORDER BY fabrika_id');
        const departments = ['kot', 'penye', 'pamuklu'];
        
        let addedCount = 0;
        const months = [10, 11, 12]; // Ekim, Kasım, Aralık
        const monthNames = { 10: 'Ekim', 11: 'Kasım', 12: 'Aralık' };
        
        for (const factory of factories) {
            for (const dept of departments) {
                // Mevcut kayıtları kontrol et
                const [existingRecords] = await promisePool.query(`
                    SELECT * FROM tekstil_dss_yeni.ihracat_verileri
                    WHERE fabrika_id = ? AND departman_adi = ?
                    ORDER BY veri_donemi
                `, [factory.fabrika_id, dept]);
                
                // Ortalama hedef ve gerçekleşen miktarları hesapla
                let avgTarget = 0;
                let avgShipped = 0;
                
                if (existingRecords.length > 0) {
                    const totalTarget = existingRecords.reduce((sum, r) => sum + (r.hedef_sevkiyat_miktari || 0), 0);
                    const totalShipped = existingRecords.reduce((sum, r) => sum + (r.gerceklesen_sevkiyat_miktari || 0), 0);
                    avgTarget = Math.floor(totalTarget / existingRecords.length);
                    avgShipped = Math.floor(totalShipped / existingRecords.length);
                } else {
                    // Varsayılan değerler
                    const baseTargets = { kot: 20000, penye: 17500, pamuklu: 12500 };
                    const baseShipped = { kot: 18000, penye: 16000, pamuklu: 11500 };
                    avgTarget = baseTargets[dept] || 15000;
                    avgShipped = baseShipped[dept] || 14000;
                }
                
                // Eksik ayları ekle (Ekim, Kasım, Aralık)
                for (const month of months) {
                    // Ayın son gününü al (Aralık için 31, Kasım için 30, Ekim için 31)
                    const daysInMonth = new Date(2024, month, 0).getDate();
                    const date = new Date(2024, month - 1, daysInMonth);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    // Bu ay için kayıt var mı kontrol et
                    const [existingMonth] = await promisePool.query(`
                        SELECT * FROM tekstil_dss_yeni.ihracat_verileri
                        WHERE fabrika_id = ? AND departman_adi = ? AND veri_donemi = ?
                    `, [factory.fabrika_id, dept, dateStr]);
                    
                    if (existingMonth.length > 0) {
                        console.log(`⏭️  ${factory.fabrika_id} - ${dept} - ${dateStr} zaten mevcut, atlanıyor...`);
                        continue;
                    }
                    
                    // Aylık hedef ve gerçekleşen miktarları hesapla
                    const monthlyTarget = Math.floor(avgTarget / 12);
                    const monthlyShipped = Math.floor(avgShipped / 12);
                    
                    // Aylara göre değişkenlik ekle (%80-110 arası)
                    const variation = 0.8 + (Math.random() * 0.3);
                    const targetQty = Math.floor(monthlyTarget * variation);
                    const shippedQty = Math.floor(monthlyShipped * variation);
                    
                    // Gecikme, kalite ve şikayet oranları
                    const delayDays = Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0;
                    const qualityRate = 92 + (Math.random() * 6);
                    const complaintRate = Math.random() * 3;
                    
                    await promisePool.query(`
                        INSERT INTO tekstil_dss_yeni.ihracat_verileri 
                        (fabrika_id, departman_adi, veri_donemi, hedef_sevkiyat_miktari, gerceklesen_sevkiyat_miktari, 
                         sevkiyat_gecikmeleri_gun, kalite_kontrol_gecis_yuzde, musteri_sikayet_sayisi)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [factory.fabrika_id, dept, dateStr, targetQty, shippedQty, delayDays, qualityRate.toFixed(2), complaintRate.toFixed(2)]);
                    
                    addedCount++;
                    console.log(`✅ ${factory.fabrika_id} - ${dept} - ${dateStr} eklendi`);
                }
            }
        }
        
        console.log(`\n✅ ${addedCount} yeni kayıt eklendi.\n`);
        
        // Sonuç kontrolü
        const [summary] = await promisePool.query(`
            SELECT 
                f.fabrika_adi,
                iv.departman_adi,
                COUNT(*) as count,
                MIN(veri_donemi) as ilk_ay,
                MAX(veri_donemi) as son_ay
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            GROUP BY f.fabrika_adi, iv.departman_adi
            ORDER BY f.fabrika_adi, iv.departman_adi
        `);
        
        console.log('📊 Güncel durum (Fabrika-Departman bazlı):');
        summary.forEach(r => {
            console.log(`  ${r.fabrika_adi} - ${r.departman_adi}: ${r.count} kayıt (${r.ilk_ay} - ${r.son_ay})`);
        });
        
        const [total] = await promisePool.query(`
            SELECT COUNT(*) as total FROM tekstil_dss_yeni.ihracat_verileri
        `);
        console.log(`\n✅ Toplam ${total[0].total} kayıt var.`);
        
        // Üretim verileri için de kontrol et
        console.log('\n📦 Üretim verileri kontrol ediliyor...');
        const [productionSummary] = await promisePool.query(`
            SELECT 
                f.fabrika_adi,
                COUNT(*) as count,
                MIN(veri_ayi) as ilk_ay,
                MAX(veri_ayi) as son_ay
            FROM tekstil_dss_yeni.uretim_verileri uv
            JOIN tekstil_dss_yeni.fabrikalar f ON uv.fabrika_id = f.fabrika_id
            GROUP BY f.fabrika_adi
            ORDER BY f.fabrika_adi
        `);
        
        productionSummary.forEach(r => {
            console.log(`  ${r.fabrika_adi}: ${r.count} kayıt (${r.ilk_ay} - ${r.son_ay})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

add12MonthData();

