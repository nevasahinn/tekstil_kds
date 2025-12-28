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

async function removeDuplicates() {
    try {
        console.log('🔍 Tekrarlanan ihracat kayıtları temizleniyor...\n');
        
        // Her fabrika-departman-dönem kombinasyonu için en yüksek ID'yi tut
        const [duplicates] = await promisePool.query(`
            SELECT 
                iv1.ihracat_id,
                iv1.fabrika_id,
                iv1.departman_adi,
                iv1.veri_donemi
            FROM tekstil_dss_yeni.ihracat_verileri iv1
            WHERE iv1.ihracat_id NOT IN (
                SELECT MAX(iv2.ihracat_id)
                FROM tekstil_dss_yeni.ihracat_verileri iv2
                GROUP BY iv2.fabrika_id, iv2.departman_adi, iv2.veri_donemi
            )
        `);
        
        if (duplicates.length === 0) {
            console.log('✅ Tekrarlanan kayıt bulunamadı.');
            process.exit(0);
        }
        
        console.log(`⚠️  ${duplicates.length} tekrarlanan kayıt bulundu.\n`);
        console.log('Silinecek kayıtlar:');
        duplicates.slice(0, 10).forEach(d => {
            console.log(`  ID: ${d.ihracat_id}, Fabrika: ${d.fabrika_id}, Departman: ${d.departman_adi}, Dönem: ${d.veri_donemi}`);
        });
        if (duplicates.length > 10) {
            console.log(`  ... ve ${duplicates.length - 10} kayıt daha`);
        }
        
        // Tekrarlanan kayıtları sil
        const deleteIds = duplicates.map(d => d.ihracat_id);
        
        console.log('\n🗑️  Tekrarlanan kayıtlar siliniyor...');
        await promisePool.query(`
            DELETE FROM tekstil_dss_yeni.ihracat_verileri 
            WHERE ihracat_id IN (?)
        `, [deleteIds]);
        
        console.log(`✅ ${deleteIds.length} kayıt silindi.\n`);
        
        // Sonuç kontrolü
        const [remaining] = await promisePool.query(`
            SELECT 
                f.fabrika_adi,
                iv.departman_adi,
                COUNT(*) as count
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            GROUP BY f.fabrika_adi, iv.departman_adi
            ORDER BY f.fabrika_adi, iv.departman_adi
        `);
        
        console.log('📊 Kalan kayıtlar (Fabrika-Departman bazlı):');
        remaining.forEach(r => {
            console.log(`  ${r.fabrika_adi} - ${r.departman_adi}: ${r.count} kayıt`);
        });
        
        const [total] = await promisePool.query(`
            SELECT COUNT(*) as total FROM tekstil_dss_yeni.ihracat_verileri
        `);
        console.log(`\n✅ Toplam ${total[0].total} kayıt kaldı.`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

removeDuplicates();

