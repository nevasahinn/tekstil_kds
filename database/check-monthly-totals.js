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

async function checkMonthlyTotals() {
    try {
        console.log('📊 Aylık Toplam Veriler Kontrol Ediliyor...\n');
        
        // Üretim verileri
        const [production] = await promisePool.query(`
            SELECT 
                MONTH(veri_ayi) as ay,
                SUM(aylik_uretim_miktari) as toplam_uretim
            FROM tekstil_dss_yeni.uretim_verileri
            WHERE YEAR(veri_ayi) = 2024
            GROUP BY MONTH(veri_ayi)
            ORDER BY ay
        `);
        
        console.log('📦 Aylık Toplam Üretim (Tüm Fabrikalar):');
        production.forEach(r => {
            console.log(`  Ay ${r.ay}: ${Math.floor(r.toplam_uretim).toLocaleString('tr-TR')} adet`);
        });
        
        // Maliyet verileri
        const [costs] = await promisePool.query(`
            SELECT 
                MONTH(veri_ayi) as ay,
                SUM(hammadde_maliyeti) as toplam_hammadde,
                SUM(iscilik_maliyeti) as toplam_iscilik,
                SUM(enerji_maliyeti) as toplam_enerji
            FROM tekstil_dss_yeni.finansal_veriler
            WHERE YEAR(veri_ayi) = 2024
            GROUP BY MONTH(veri_ayi)
            ORDER BY ay
        `);
        
        console.log('\n💰 Aylık Toplam Maliyetler (Tüm Fabrikalar):');
        costs.forEach(r => {
            console.log(`  Ay ${r.ay}:`);
            console.log(`    Hammadde: ${Math.floor(r.toplam_hammadde).toLocaleString('tr-TR')} TL`);
            console.log(`    İşçilik: ${Math.floor(r.toplam_iscilik).toLocaleString('tr-TR')} TL`);
            console.log(`    Enerji: ${Math.floor(r.toplam_enerji).toLocaleString('tr-TR')} TL`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

checkMonthlyTotals();

