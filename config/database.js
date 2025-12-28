const mysql = require('mysql2');
require('dotenv').config();

// MySQL bağlantı havuzu oluştur
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tekstil_dss_yeni',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promise tabanlı query fonksiyonu
const promisePool = pool.promise();

// Bağlantı testi
pool.getConnection((err, connection) => {
    if (err) {
        console.error('MySQL bağlantı hatası:', err);
    } else {
        console.log('MySQL veritabanına başarıyla bağlandı');
        connection.release();
    }
});

module.exports = promisePool;

