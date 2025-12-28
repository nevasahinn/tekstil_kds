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

async function checkDelays() {
    try {
        console.log('🔍 İstanbul Fabrikası - Pamuklu Gecikmeleri Kontrol Ediliyor...\n');
        
        // İstanbul Fabrikası Pamuklu için gecikmeler
        const [istanbulDelays] = await promisePool.query(`
            SELECT 
                iv.veri_donemi,
                iv.sevkiyat_gecikmeleri_gun,
                iv.hedef_sevkiyat_miktari,
                iv.gerceklesen_sevkiyat_miktari,
                f.fabrika_adi,
                iv.departman_adi
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            WHERE f.fabrika_adi LIKE '%İstanbul%' 
            AND iv.departman_adi = 'pamuklu'
            AND iv.sevkiyat_gecikmeleri_gun > 0
            ORDER BY iv.veri_donemi DESC
        `);
        
        console.log(`📊 İstanbul Fabrikası - Pamuklu için toplam ${istanbulDelays.length} gecikme kaydı bulundu:\n`);
        
        istanbulDelays.forEach((r, i) => {
            console.log(`Kayıt ${i+1}:`);
            console.log(`  Dönem: ${r.veri_donemi}`);
            console.log(`  Gecikme: ${r.sevkiyat_gecikmeleri_gun} gün`);
            console.log(`  Hedef: ${r.hedef_sevkiyat_miktari}`);
            console.log(`  Gerçekleşen: ${r.gerceklesen_sevkiyat_miktari}`);
            console.log('');
        });
        
        // Her fabrika-departman için toplam kayıt sayısı
        console.log('\n📈 Her Fabrika-Departman için Toplam Kayıt Sayısı:\n');
        const [allRecords] = await promisePool.query(`
            SELECT 
                f.fabrika_adi,
                iv.departman_adi,
                COUNT(*) as toplam_kayit,
                COUNT(CASE WHEN iv.sevkiyat_gecikmeleri_gun > 0 THEN 1 END) as gecikme_sayisi
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            GROUP BY f.fabrika_adi, iv.departman_adi
            ORDER BY f.fabrika_adi, iv.departman_adi
        `);
        
        allRecords.forEach(r => {
            console.log(`${r.fabrika_adi} - ${r.departman_adi}:`);
            console.log(`  Toplam kayıt: ${r.toplam_kayit}`);
            console.log(`  Gecikme sayısı: ${r.gecikme_sayisi}`);
            console.log('');
        });
        
        // Açıklama
        console.log('\n💡 AÇIKLAMA:');
        console.log('Her kayıt = Bir ay/dönem için bir sevkiyat');
        console.log('Örneğin: İstanbul Fabrikası - Pamuklu için 2 kayıt varsa,');
        console.log('bu 2 farklı ay/dönemde gecikme olduğu anlamına gelir.');
        console.log('(Örn: Ocak 2024 ve Temmuz 2024)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

checkDelays();

