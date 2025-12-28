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

async function checkFactories() {
    try {
        const [rows] = await promisePool.query(`
            SELECT fabrika_id, fabrika_adi, sehir 
            FROM tekstil_dss_yeni.fabrikalar 
            ORDER BY fabrika_id
        `);
        
        console.log(`Toplam ${rows.length} fabrika kaydı bulundu:\n`);
        rows.forEach(r => {
            console.log(`ID: ${r.fabrika_id}, Ad: ${r.fabrika_adi}, Şehir: ${r.sehir}`);
        });
        
        // Tekrarlananları bul
        const duplicates = {};
        rows.forEach(r => {
            const key = `${r.fabrika_adi}-${r.sehir}`;
            if (!duplicates[key]) {
                duplicates[key] = [];
            }
            duplicates[key].push(r.fabrika_id);
        });
        
        console.log('\nTekrarlanan fabrikalar:');
        Object.keys(duplicates).forEach(key => {
            if (duplicates[key].length > 1) {
                console.log(`${key}: ${duplicates[key].length} kez (ID'ler: ${duplicates[key].join(', ')})`);
            }
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error.message);
        process.exit(1);
    }
}

checkFactories();

