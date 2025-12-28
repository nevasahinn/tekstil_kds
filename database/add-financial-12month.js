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

async function addFinancial12Month() {
    try {
        console.log('💰 Finansal veriler 12 aya tamamlanıyor...\n');
        
        const [factories] = await promisePool.query('SELECT fabrika_id FROM tekstil_dss_yeni.fabrikalar ORDER BY fabrika_id');
        const months = [10, 11, 12]; // Ekim, Kasım, Aralık
        
        let addedCount = 0;
        
        for (const factory of factories) {
            // Mevcut finansal verileri kontrol et
            const [existing] = await promisePool.query(`
                SELECT * FROM tekstil_dss_yeni.finansal_veriler
                WHERE fabrika_id = ?
                ORDER BY veri_ayi
            `, [factory.fabrika_id]);
            
            // Ortalama değerleri hesapla
            let avgRawMaterial = 0;
            let avgLabor = 0;
            let avgEnergy = 0;
            let avgProfit = 0;
            let avgBudget = 0;
            
            if (existing.length > 0) {
                avgRawMaterial = existing.reduce((sum, r) => sum + (parseFloat(r.hammadde_maliyeti) || 0), 0) / existing.length;
                avgLabor = existing.reduce((sum, r) => sum + (parseFloat(r.iscilik_maliyeti) || 0), 0) / existing.length;
                avgEnergy = existing.reduce((sum, r) => sum + (parseFloat(r.enerji_maliyeti) || 0), 0) / existing.length;
                avgProfit = existing.reduce((sum, r) => sum + (parseFloat(r.gerceklesen_kar) || 0), 0) / existing.length;
                avgBudget = existing.reduce((sum, r) => sum + (parseFloat(r.butcelenen_maliyet) || 0), 0) / existing.length;
            } else {
                // Varsayılan değerler
                avgRawMaterial = 500000;
                avgLabor = 300000;
                avgEnergy = 100000;
                avgProfit = 200000;
                avgBudget = 900000;
            }
            
            // Eksik ayları ekle
            for (const month of months) {
                const daysInMonth = new Date(2024, month, 0).getDate();
                const date = new Date(2024, month - 1, daysInMonth);
                const dateStr = date.toISOString().split('T')[0];
                
                // Bu ay için kayıt var mı kontrol et
                const [existingMonth] = await promisePool.query(`
                    SELECT * FROM tekstil_dss_yeni.finansal_veriler
                    WHERE fabrika_id = ? AND veri_ayi = ?
                `, [factory.fabrika_id, dateStr]);
                
                if (existingMonth.length > 0) {
                    console.log(`⏭️  ${factory.fabrika_id} - ${dateStr} zaten mevcut, atlanıyor...`);
                    continue;
                }
                
                // Değişkenlik ekle
                const variation = 0.85 + (Math.random() * 0.3);
                const rawMaterial = Math.floor(avgRawMaterial * variation);
                const labor = Math.floor(avgLabor * variation);
                const energy = Math.floor(avgEnergy * variation);
                const profit = Math.floor(avgProfit * variation);
                const budget = Math.floor(avgBudget * variation);
                
                await promisePool.query(`
                    INSERT INTO tekstil_dss_yeni.finansal_veriler
                    (fabrika_id, veri_ayi, hammadde_maliyeti, iscilik_maliyeti, 
                     enerji_maliyeti, gerceklesen_kar, butcelenen_maliyet)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [factory.fabrika_id, dateStr, rawMaterial, labor, energy, profit, budget]);
                
                addedCount++;
                console.log(`✅ ${factory.fabrika_id} - ${dateStr} eklendi`);
            }
        }
        
        console.log(`\n✅ ${addedCount} yeni finansal kayıt eklendi.\n`);
        
        // Sonuç kontrolü
        const [summary] = await promisePool.query(`
            SELECT 
                f.fabrika_adi,
                COUNT(*) as count,
                MIN(veri_ayi) as ilk_ay,
                MAX(veri_ayi) as son_ay
            FROM tekstil_dss_yeni.finansal_veriler fv
            JOIN tekstil_dss_yeni.fabrikalar f ON fv.fabrika_id = f.fabrika_id
            GROUP BY f.fabrika_adi
            ORDER BY f.fabrika_adi
        `);
        
        summary.forEach(r => {
            console.log(`  ${r.fabrika_adi}: ${r.count} kayıt (${r.ilk_ay} - ${r.son_ay})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addFinancial12Month();

