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

async function checkDepartments() {
    try {
        const [rows] = await promisePool.query(`
            SELECT iv.ihracat_id, iv.fabrika_id, iv.departman_adi, 
                   f.fabrika_adi, iv.hedef_sevkiyat_miktari, iv.gerceklesen_sevkiyat_miktari
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            ORDER BY iv.fabrika_id, iv.departman_adi
            LIMIT 15
        `);
        
        console.log('İlk 15 kayıt:\n');
        rows.forEach(r => {
            console.log(`ID: ${r.ihracat_id}, Fabrika: ${r.fabrika_adi}, Departman: ${r.departman_adi || 'NULL'}, Hedef: ${r.hedef_sevkiyat_miktari}, Gerçekleşen: ${r.gerceklesen_sevkiyat_miktari}`);
        });
        
        // NULL kontrolü
        const [nullCheck] = await promisePool.query(`
            SELECT COUNT(*) as count 
            FROM tekstil_dss_yeni.ihracat_verileri 
            WHERE departman_adi IS NULL OR departman_adi = ''
        `);
        
        console.log(`\nNULL veya boş departman sayısı: ${nullCheck[0].count}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error.message);
        process.exit(1);
    }
}

checkDepartments();

