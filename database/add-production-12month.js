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

async function addProduction12Month() {
    try {
        console.log('📦 Üretim verileri 12 aya tamamlanıyor...\n');
        
        const [factories] = await promisePool.query('SELECT fabrika_id FROM tekstil_dss_yeni.fabrikalar ORDER BY fabrika_id');
        const months = [10, 11, 12]; // Ekim, Kasım, Aralık
        
        let addedCount = 0;
        
        for (const factory of factories) {
            // Mevcut üretim verilerini kontrol et
            const [existing] = await promisePool.query(`
                SELECT * FROM tekstil_dss_yeni.uretim_verileri
                WHERE fabrika_id = ?
                ORDER BY veri_ayi
            `, [factory.fabrika_id]);
            
            // Ortalama değerleri hesapla
            let avgProduction = 0;
            let avgCapacity = 0;
            let avgWaste = 0;
            let avgMachineUtil = 0;
            let avgWorkforce = 0;
            
            if (existing.length > 0) {
                avgProduction = Math.floor(existing.reduce((sum, r) => sum + (r.aylik_uretim_miktari || 0), 0) / existing.length);
                avgCapacity = Math.floor(existing.reduce((sum, r) => sum + (r.maks_kapasite_miktari || 0), 0) / existing.length);
                avgWaste = existing.reduce((sum, r) => sum + (parseFloat(r.fire_orani_yuzde) || 0), 0) / existing.length;
                avgMachineUtil = existing.reduce((sum, r) => sum + (parseFloat(r.makine_kullanim_yuzde) || 0), 0) / existing.length;
                avgWorkforce = Math.floor(existing.reduce((sum, r) => sum + (r.is_gucu_sayisi || 0), 0) / existing.length);
            } else {
                // Varsayılan değerler
                avgProduction = 15000;
                avgCapacity = 20000;
                avgWaste = 3.5;
                avgMachineUtil = 75;
                avgWorkforce = 150;
            }
            
            // Eksik ayları ekle
            for (const month of months) {
                const daysInMonth = new Date(2024, month, 0).getDate();
                const date = new Date(2024, month - 1, daysInMonth);
                const dateStr = date.toISOString().split('T')[0];
                
                // Bu ay için kayıt var mı kontrol et
                const [existingMonth] = await promisePool.query(`
                    SELECT * FROM tekstil_dss_yeni.uretim_verileri
                    WHERE fabrika_id = ? AND veri_ayi = ?
                `, [factory.fabrika_id, dateStr]);
                
                if (existingMonth.length > 0) {
                    console.log(`⏭️  ${factory.fabrika_id} - ${dateStr} zaten mevcut, atlanıyor...`);
                    continue;
                }
                
                // Değişkenlik ekle
                const variation = 0.85 + (Math.random() * 0.3);
                const production = Math.floor(avgProduction * variation);
                const capacity = Math.floor(avgCapacity * variation);
                const waste = Math.max(0, Math.min(10, avgWaste + (Math.random() * 2 - 1)));
                const machineUtil = Math.max(0, Math.min(100, avgMachineUtil + (Math.random() * 10 - 5)));
                const workforce = Math.floor(avgWorkforce * (0.95 + Math.random() * 0.1));
                
                await promisePool.query(`
                    INSERT INTO tekstil_dss_yeni.uretim_verileri
                    (fabrika_id, veri_ayi, aylik_uretim_miktari, maks_kapasite_miktari, 
                     fire_orani_yuzde, makine_kullanim_yuzde, is_gucu_sayisi)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [factory.fabrika_id, dateStr, production, capacity, waste.toFixed(2), machineUtil.toFixed(2), workforce]);
                
                addedCount++;
                console.log(`✅ ${factory.fabrika_id} - ${dateStr} eklendi`);
            }
        }
        
        console.log(`\n✅ ${addedCount} yeni üretim kaydı eklendi.\n`);
        
        // Finansal verileri de kontrol et
        console.log('💰 Finansal veriler kontrol ediliyor...');
        const [financialSummary] = await promisePool.query(`
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
        
        financialSummary.forEach(r => {
            console.log(`  ${r.fabrika_adi}: ${r.count} kayıt (${r.ilk_ay} - ${r.son_ay})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addProduction12Month();

