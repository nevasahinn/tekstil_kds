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

async function checkDuplicates() {
    try {
        // Tüm kayıtları getir
        const [allRecords] = await promisePool.query(`
            SELECT iv.ihracat_id, iv.fabrika_id, iv.departman_adi, iv.veri_donemi,
                   f.fabrika_adi, iv.hedef_sevkiyat_miktari, iv.gerceklesen_sevkiyat_miktari
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            ORDER BY iv.fabrika_id, iv.departman_adi, iv.veri_donemi
        `);
        
        console.log(`Toplam kayıt sayısı: ${allRecords.length}\n`);
        
        // Tekrarlanan kayıtları bul
        const duplicates = {};
        allRecords.forEach(r => {
            const key = `${r.fabrika_id}-${r.departman_adi}-${r.veri_donemi}`;
            if (!duplicates[key]) {
                duplicates[key] = [];
            }
            duplicates[key].push(r);
        });
        
        console.log('Tekrarlanan kayıtlar:\n');
        let duplicateCount = 0;
        Object.keys(duplicates).forEach(key => {
            if (duplicates[key].length > 1) {
                duplicateCount++;
                console.log(`Key: ${key} - ${duplicates[key].length} kez tekrar:`);
                duplicates[key].forEach((rec, idx) => {
                    console.log(`  ${idx + 1}. ID: ${rec.ihracat_id}, Hedef: ${rec.hedef_sevkiyat_miktari}, Gerçekleşen: ${rec.gerceklesen_sevkiyat_miktari}`);
                });
                console.log('');
            }
        });
        
        if (duplicateCount === 0) {
            console.log('✅ Tekrarlanan kayıt bulunamadı.');
        }
        
        // Fabrika ve departman bazlı özet
        console.log('\n📊 Fabrika ve Departman Bazlı Özet:');
        const summary = {};
        allRecords.forEach(r => {
            const key = `${r.fabrika_adi} - ${r.departman_adi}`;
            if (!summary[key]) {
                summary[key] = 0;
            }
            summary[key]++;
        });
        
        Object.keys(summary).sort().forEach(key => {
            console.log(`  ${key}: ${summary[key]} kayıt`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error.message);
        process.exit(1);
    }
}

checkDuplicates();

