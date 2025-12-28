// Veritabanındaki mevcut verileri kontrol et
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

async function checkData() {
    try {
        console.log('📊 Veritabanı verileri kontrol ediliyor...\n');

        // Fabrikalar
        const [factories] = await promisePool.query('SELECT COUNT(*) as count FROM tekstil_dss_yeni.fabrikalar');
        console.log(`✅ Fabrikalar: ${factories[0].count} adet`);

        // Üretim verileri
        const [production] = await promisePool.query('SELECT COUNT(*) as count FROM tekstil_dss_yeni.uretim_verileri');
        console.log(`✅ Üretim Verileri: ${production[0].count} adet`);

        // İhracat verileri
        const [exportData] = await promisePool.query('SELECT COUNT(*) as count FROM tekstil_dss_yeni.ihracat_verileri');
        console.log(`✅ İhracat Verileri: ${exportData[0].count} adet`);

        // Finansal veriler
        const [financial] = await promisePool.query('SELECT COUNT(*) as count FROM tekstil_dss_yeni.finansal_veriler');
        console.log(`✅ Finansal Veriler: ${financial[0].count} adet`);

        // Performans metrikleri
        const [performance] = await promisePool.query('SELECT COUNT(*) as count FROM tekstil_dss_yeni.fabrika_performans_metrikleri');
        console.log(`✅ Performans Metrikleri: ${performance[0].count} adet`);

        console.log('\n📋 Özet:');
        if (factories[0].count === 0) {
            console.log('⚠️  Fabrika verisi yok - Önce fabrika eklemelisiniz!');
        }
        if (production[0].count === 0) {
            console.log('⚠️  Üretim verisi yok');
        }
        if (exportData[0].count === 0) {
            console.log('⚠️  İhracat verisi yok');
        }
        if (financial[0].count === 0) {
            console.log('⚠️  Finansal veri yok');
        }

        if (factories[0].count > 0 && production[0].count > 0) {
            console.log('✅ Temel veriler mevcut - Dashboard çalışabilir!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

checkData();

