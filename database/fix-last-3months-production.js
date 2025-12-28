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

async function fixLast3MonthsProduction() {
    try {
        console.log('🔧 Son 3 ayın üretim verileri düzeltiliyor...\n');
        
        // İlk 9 ayın ortalamasını hesapla
        const [first9Months] = await promisePool.query(`
            SELECT 
                AVG(aylik_uretim_miktari) as avg_production,
                AVG(maks_kapasite_miktari) as avg_capacity,
                AVG(fire_orani_yuzde) as avg_waste,
                AVG(makine_kullanim_yuzde) as avg_machine_util,
                AVG(is_gucu_sayisi) as avg_workforce
            FROM tekstil_dss_yeni.uretim_verileri
            WHERE YEAR(veri_ayi) = 2024
            AND MONTH(veri_ayi) BETWEEN 1 AND 9
        `);
        
        const avgProduction = Math.floor(first9Months[0].avg_production || 0);
        const avgCapacity = Math.floor(first9Months[0].avg_capacity || 0);
        const avgWaste = parseFloat(first9Months[0].avg_waste || 0);
        const avgMachineUtil = parseFloat(first9Months[0].avg_machine_util || 0);
        const avgWorkforce = Math.floor(first9Months[0].avg_workforce || 0);
        
        console.log(`📊 İlk 9 ayın ortalamaları:`);
        console.log(`  Ortalama Üretim: ${avgProduction} adet`);
        console.log(`  Ortalama Kapasite: ${avgCapacity} adet`);
        console.log(`  Ortalama Fire: ${avgWaste.toFixed(2)}%`);
        console.log(`  Ortalama Makine Kullanımı: ${avgMachineUtil.toFixed(2)}%`);
        console.log(`  Ortalama İş Gücü: ${avgWorkforce} kişi\n`);
        
        // Son 3 ayı güncelle (Ekim, Kasım, Aralık)
        const [factories] = await promisePool.query('SELECT fabrika_id FROM tekstil_dss_yeni.fabrikalar ORDER BY fabrika_id');
        const months = [10, 11, 12];
        
        let updatedCount = 0;
        
        for (const factory of factories) {
            for (const month of months) {
                const daysInMonth = new Date(2024, month, 0).getDate();
                const date = new Date(2024, month - 1, daysInMonth);
                const dateStr = date.toISOString().split('T')[0];
                
                // Değişkenlik ekle (%85-115 arası)
                const variation = 0.85 + (Math.random() * 0.3);
                const production = Math.floor(avgProduction * variation);
                const capacity = Math.floor(avgCapacity * variation);
                const waste = Math.max(0, Math.min(10, avgWaste + (Math.random() * 2 - 1)));
                const machineUtil = Math.max(0, Math.min(100, avgMachineUtil + (Math.random() * 10 - 5)));
                const workforce = Math.floor(avgWorkforce * (0.95 + Math.random() * 0.1));
                
                await promisePool.query(`
                    UPDATE tekstil_dss_yeni.uretim_verileri
                    SET 
                        aylik_uretim_miktari = ?,
                        maks_kapasite_miktari = ?,
                        fire_orani_yuzde = ?,
                        makine_kullanim_yuzde = ?,
                        is_gucu_sayisi = ?
                    WHERE fabrika_id = ? AND veri_ayi = ?
                `, [production, capacity, waste.toFixed(2), machineUtil.toFixed(2), workforce, factory.fabrika_id, dateStr]);
                
                updatedCount++;
                console.log(`✅ ${factory.fabrika_id} - ${dateStr}: ${production} adet`);
            }
        }
        
        console.log(`\n✅ ${updatedCount} kayıt güncellendi.\n`);
        
        // Sonuç kontrolü
        const [result] = await promisePool.query(`
            SELECT 
                MONTH(veri_ayi) as ay,
                AVG(aylik_uretim_miktari) as ortalama_uretim,
                COUNT(*) as kayit_sayisi
            FROM tekstil_dss_yeni.uretim_verileri
            WHERE YEAR(veri_ayi) = 2024
            GROUP BY MONTH(veri_ayi)
            ORDER BY ay
        `);
        
        console.log('📊 Güncellenmiş Aylık Ortalama Üretim:');
        result.forEach(r => {
            console.log(`  Ay ${r.ay}: ${Math.floor(r.ortalama_uretim)} adet (${r.kayit_sayisi} kayıt)`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

fixLast3MonthsProduction();

