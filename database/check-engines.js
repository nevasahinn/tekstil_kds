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

async function checkEngines() {
    try {
        console.log('🔍 Tablo engine\'leri kontrol ediliyor...\n');
        
        const [tables] = await promisePool.query(`
            SELECT 
                TABLE_NAME,
                ENGINE,
                TABLE_TYPE
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = 'tekstil_dss_yeni'
            ORDER BY TABLE_NAME
        `);
        
        console.log('📊 Mevcut Tablolar ve Engine\'leri:\n');
        tables.forEach(table => {
            const status = table.ENGINE === 'InnoDB' ? '✅' : '⚠️';
            console.log(`${status} ${table.TABLE_NAME}: ${table.ENGINE || 'N/A'}`);
        });
        
        const nonInnoDB = tables.filter(t => t.ENGINE && t.ENGINE !== 'InnoDB');
        
        if (nonInnoDB.length === 0) {
            console.log('\n✅ Tüm tablolar InnoDB engine kullanıyor!');
        } else {
            console.log(`\n⚠️  ${nonInnoDB.length} tablo InnoDB değil:`);
            nonInnoDB.forEach(t => {
                console.log(`   - ${t.TABLE_NAME}: ${t.ENGINE}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

checkEngines();

