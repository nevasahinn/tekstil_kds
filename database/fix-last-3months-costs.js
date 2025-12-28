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

async function fixLast3MonthsCosts() {
    try {
        console.log('💰 Son 3 ayın maliyet verileri düzeltiliyor...\n');
        
        // İlk 9 ayın ortalamasını hesapla
        const [first9Months] = await promisePool.query(`
            SELECT 
                AVG(hammadde_maliyeti) as avg_raw_material,
                AVG(iscilik_maliyeti) as avg_labor,
                AVG(enerji_maliyeti) as avg_energy,
                AVG(gerceklesen_kar) as avg_profit,
                AVG(butcelenen_maliyet) as avg_budget
            FROM tekstil_dss_yeni.finansal_veriler
            WHERE YEAR(veri_ayi) = 2024
            AND MONTH(veri_ayi) BETWEEN 1 AND 9
        `);
        
        const avgRawMaterial = parseFloat(first9Months[0].avg_raw_material || 0);
        const avgLabor = parseFloat(first9Months[0].avg_labor || 0);
        const avgEnergy = parseFloat(first9Months[0].avg_energy || 0);
        const avgProfit = parseFloat(first9Months[0].avg_profit || 0);
        const avgBudget = parseFloat(first9Months[0].avg_budget || 0);
        
        console.log(`📊 İlk 9 ayın ortalamaları:`);
        console.log(`  Ortalama Hammadde: ${Math.floor(avgRawMaterial).toLocaleString('tr-TR')} TL`);
        console.log(`  Ortalama İşçilik: ${Math.floor(avgLabor).toLocaleString('tr-TR')} TL`);
        console.log(`  Ortalama Enerji: ${Math.floor(avgEnergy).toLocaleString('tr-TR')} TL`);
        console.log(`  Ortalama Kar: ${Math.floor(avgProfit).toLocaleString('tr-TR')} TL`);
        console.log(`  Ortalama Bütçe: ${Math.floor(avgBudget).toLocaleString('tr-TR')} TL\n`);
        
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
                const rawMaterial = Math.floor(avgRawMaterial * variation);
                const labor = Math.floor(avgLabor * variation);
                const energy = Math.floor(avgEnergy * variation);
                const profit = Math.floor(avgProfit * variation);
                const budget = Math.floor(avgBudget * variation);
                
                await promisePool.query(`
                    UPDATE tekstil_dss_yeni.finansal_veriler
                    SET 
                        hammadde_maliyeti = ?,
                        iscilik_maliyeti = ?,
                        enerji_maliyeti = ?,
                        gerceklesen_kar = ?,
                        butcelenen_maliyet = ?
                    WHERE fabrika_id = ? AND veri_ayi = ?
                `, [rawMaterial, labor, energy, profit, budget, factory.fabrika_id, dateStr]);
                
                updatedCount++;
                console.log(`✅ ${factory.fabrika_id} - ${dateStr}: Hammadde=${Math.floor(rawMaterial).toLocaleString('tr-TR')}, İşçilik=${Math.floor(labor).toLocaleString('tr-TR')}, Enerji=${Math.floor(energy).toLocaleString('tr-TR')}`);
            }
        }
        
        console.log(`\n✅ ${updatedCount} kayıt güncellendi.\n`);
        
        // Sonuç kontrolü
        const [result] = await promisePool.query(`
            SELECT 
                MONTH(veri_ayi) as ay,
                AVG(hammadde_maliyeti) as ortalama_hammadde,
                AVG(iscilik_maliyeti) as ortalama_iscilik,
                AVG(enerji_maliyeti) as ortalama_enerji,
                COUNT(*) as kayit_sayisi
            FROM tekstil_dss_yeni.finansal_veriler
            WHERE YEAR(veri_ayi) = 2024
            GROUP BY MONTH(veri_ayi)
            ORDER BY ay
        `);
        
        console.log('📊 Güncellenmiş Aylık Ortalama Maliyetler:');
        result.forEach(r => {
            console.log(`  Ay ${r.ay}:`);
            console.log(`    Hammadde: ${Math.floor(r.ortalama_hammadde).toLocaleString('tr-TR')} TL`);
            console.log(`    İşçilik: ${Math.floor(r.ortalama_iscilik).toLocaleString('tr-TR')} TL`);
            console.log(`    Enerji: ${Math.floor(r.ortalama_enerji).toLocaleString('tr-TR')} TL`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

fixLast3MonthsCosts();

