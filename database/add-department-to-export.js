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

async function addDepartmentColumn() {
    try {
        console.log('🔧 İhracat verileri tablosuna departman kolonu ekleniyor...\n');
        
        // Önce kolonun var olup olmadığını kontrol et
        const [columns] = await promisePool.query(`
            SHOW COLUMNS FROM tekstil_dss_yeni.ihracat_verileri LIKE 'departman_adi'
        `);
        
        if (columns.length === 0) {
            // Kolonu ekle
            await promisePool.query(`
                ALTER TABLE tekstil_dss_yeni.ihracat_verileri 
                ADD COLUMN departman_adi VARCHAR(50) DEFAULT 'kot' AFTER fabrika_id
            `);
            console.log('✅ Departman kolonu eklendi\n');
        } else {
            console.log('✅ Departman kolonu zaten mevcut\n');
        }
        
        // Mevcut verileri departmanlara göre böl
        console.log('📊 Mevcut veriler departmanlara göre bölünüyor...\n');
        
        const [existingData] = await promisePool.query(`
            SELECT ihracat_id, fabrika_id, hedef_sevkiyat_miktari, gerceklesen_sevkiyat_miktari,
                   sevkiyat_gecikmeleri_gun, kalite_kontrol_gecis_yuzde, musteri_sikayet_sayisi, veri_donemi
            FROM tekstil_dss_yeni.ihracat_verileri
            ORDER BY fabrika_id, ihracat_id
        `);
        
        if (existingData.length === 0) {
            console.log('⚠️  Mevcut veri bulunamadı\n');
            process.exit(0);
        }
        
        const departments = ['kot', 'penye', 'pamuklu'];
        
        // Her kaydı 3 departmana böl
        for (const record of existingData) {
            // Mevcut kaydı sil
            await promisePool.query(`
                DELETE FROM tekstil_dss_yeni.ihracat_verileri 
                WHERE ihracat_id = ?
            `, [record.ihracat_id]);
            
            // Her departman için yeni kayıt oluştur
            for (let i = 0; i < departments.length; i++) {
                const dept = departments[i];
                // Hedef ve gerçekleşen miktarları departmanlara böl (yaklaşık %40, %35, %25)
                const ratios = [0.40, 0.35, 0.25];
                const targetQty = Math.floor(record.hedef_sevkiyat_miktari * ratios[i]);
                const shippedQty = Math.floor(record.gerceklesen_sevkiyat_miktari * ratios[i]);
                
                await promisePool.query(`
                    INSERT INTO tekstil_dss_yeni.ihracat_verileri 
                    (fabrika_id, departman_adi, veri_donemi, hedef_sevkiyat_miktari, gerceklesen_sevkiyat_miktari, 
                     sevkiyat_gecikmeleri_gun, kalite_kontrol_gecis_yuzde, musteri_sikayet_sayisi)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    record.fabrika_id,
                    dept,
                    record.veri_donemi,
                    targetQty,
                    shippedQty,
                    record.sevkiyat_gecikmeleri_gun,
                    record.kalite_kontrol_gecis_yuzde,
                    record.musteri_sikayet_sayisi
                ]);
            }
        }
        
        console.log(`✅ ${existingData.length} kayıt ${existingData.length * 3} departman kaydına dönüştürüldü\n`);
        
        // Sonuç kontrolü
        const [result] = await promisePool.query(`
            SELECT fabrika_id, departman_adi, COUNT(*) as count
            FROM tekstil_dss_yeni.ihracat_verileri
            GROUP BY fabrika_id, departman_adi
            ORDER BY fabrika_id, departman_adi
        `);
        
        console.log('📋 Departman bazlı veri dağılımı:');
        result.forEach(r => {
            console.log(`   Fabrika ID: ${r.fabrika_id}, Departman: ${r.departman_adi}, Kayıt: ${r.count}`);
        });
        
        console.log('\n✅ İşlem tamamlandı!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addDepartmentColumn();

