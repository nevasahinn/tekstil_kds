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

async function testQuery() {
    try {
        const query = `
            SELECT 
                iv.ihracat_id as target_id,
                iv.fabrika_id as factory_id,
                iv.departman_adi as department_name,
                iv.veri_donemi as veri_donemi,
                f.fabrika_adi as factory_name,
                f.sehir as city_name,
                iv.hedef_sevkiyat_miktari as target_quantity,
                iv.gerceklesen_sevkiyat_miktari as shipped_quantity,
                (iv.hedef_sevkiyat_miktari - iv.gerceklesen_sevkiyat_miktari) as remaining_quantity,
                CASE 
                    WHEN iv.hedef_sevkiyat_miktari > 0 
                    THEN ROUND((iv.gerceklesen_sevkiyat_miktari / iv.hedef_sevkiyat_miktari) * 100, 2)
                    ELSE 0
                END as achievement_rate
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            ORDER BY iv.veri_donemi DESC, iv.fabrika_id
            LIMIT 5
        `;
        
        const [rows] = await promisePool.query(query);
        
        console.log('API\'den dönecek veri örneği:\n');
        rows.forEach(r => {
            console.log(JSON.stringify(r, null, 2));
            console.log('---');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error.message);
        process.exit(1);
    }
}

testQuery();

