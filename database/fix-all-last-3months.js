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

async function fixAllLast3Months() {
    try {
        console.log('🔧 Son 3 ayın tüm verileri düzeltiliyor...\n');
        
        // İlk 9 ayın TOPLAM değerlerini hesapla (fabrika bazlı değil, toplam)
        const [first9MonthsProd] = await promisePool.query(`
            SELECT 
                AVG(monthly_total) as avg_monthly_production
            FROM (
                SELECT 
                    MONTH(veri_ayi) as month,
                    SUM(aylik_uretim_miktari) as monthly_total
                FROM tekstil_dss_yeni.uretim_verileri
                WHERE YEAR(veri_ayi) = 2024
                AND MONTH(veri_ayi) BETWEEN 1 AND 9
                GROUP BY MONTH(veri_ayi)
            ) as monthly_totals
        `);
        
        const [first9MonthsCost] = await promisePool.query(`
            SELECT 
                AVG(monthly_hammadde) as avg_hammadde,
                AVG(monthly_iscilik) as avg_iscilik,
                AVG(monthly_enerji) as avg_enerji
            FROM (
                SELECT 
                    MONTH(veri_ayi) as month,
                    SUM(hammadde_maliyeti) as monthly_hammadde,
                    SUM(iscilik_maliyeti) as monthly_iscilik,
                    SUM(enerji_maliyeti) as monthly_enerji
                FROM tekstil_dss_yeni.finansal_veriler
                WHERE YEAR(veri_ayi) = 2024
                AND MONTH(veri_ayi) BETWEEN 1 AND 9
                GROUP BY MONTH(veri_ayi)
            ) as monthly_totals
        `);
        
        const avgMonthlyProduction = Math.floor(first9MonthsProd[0].avg_monthly_production || 0);
        const avgHammadde = Math.floor(first9MonthsCost[0].avg_hammadde || 0);
        const avgIscilik = Math.floor(first9MonthsCost[0].avg_iscilik || 0);
        const avgEnerji = Math.floor(first9MonthsCost[0].avg_enerji || 0);
        
        console.log(`📊 İlk 9 ayın AYLIK TOPLAM ortalamaları:`);
        console.log(`  Ortalama Aylık Toplam Üretim: ${avgMonthlyProduction.toLocaleString('tr-TR')} adet`);
        console.log(`  Ortalama Aylık Toplam Hammadde: ${avgHammadde.toLocaleString('tr-TR')} TL`);
        console.log(`  Ortalama Aylık Toplam İşçilik: ${avgIscilik.toLocaleString('tr-TR')} TL`);
        console.log(`  Ortalama Aylık Toplam Enerji: ${avgEnerji.toLocaleString('tr-TR')} TL\n`);
        
        // Fabrika sayısını al
        const [factories] = await promisePool.query('SELECT COUNT(*) as count FROM tekstil_dss_yeni.fabrikalar');
        const factoryCount = factories[0].count;
        
        // Fabrika başına ortalama
        const avgProdPerFactory = Math.floor(avgMonthlyProduction / factoryCount);
        const avgHammaddePerFactory = Math.floor(avgHammadde / factoryCount);
        const avgIscilikPerFactory = Math.floor(avgIscilik / factoryCount);
        const avgEnerjiPerFactory = Math.floor(avgEnerji / factoryCount);
        
        console.log(`📊 Fabrika başına ortalamalar (${factoryCount} fabrika):`);
        console.log(`  Üretim: ${avgProdPerFactory.toLocaleString('tr-TR')} adet`);
        console.log(`  Hammadde: ${avgHammaddePerFactory.toLocaleString('tr-TR')} TL`);
        console.log(`  İşçilik: ${avgIscilikPerFactory.toLocaleString('tr-TR')} TL`);
        console.log(`  Enerji: ${avgEnerjiPerFactory.toLocaleString('tr-TR')} TL\n`);
        
        // Son 3 ayı güncelle
        const [factoryList] = await promisePool.query('SELECT fabrika_id FROM tekstil_dss_yeni.fabrikalar ORDER BY fabrika_id');
        const months = [10, 11, 12];
        
        let updatedProd = 0;
        let updatedCost = 0;
        
        for (const factory of factoryList) {
            for (const month of months) {
                const daysInMonth = new Date(2024, month, 0).getDate();
                const date = new Date(2024, month - 1, daysInMonth);
                const dateStr = date.toISOString().split('T')[0];
                
                // Üretim verileri - değişkenlik ekle (%90-110 arası)
                const prodVariation = 0.90 + (Math.random() * 0.2);
                const production = Math.floor(avgProdPerFactory * prodVariation);
                const capacity = Math.floor(production * 1.5); // Kapasite üretimin 1.5 katı
                const waste = 3.5 + (Math.random() * 1 - 0.5); // 3-4% arası
                const machineUtil = 75 + (Math.random() * 15 - 7.5); // 67.5-82.5% arası
                const workforce = 150 + Math.floor(Math.random() * 20 - 10); // 140-160 arası
                
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
                
                updatedProd++;
                
                // Maliyet verileri - değişkenlik ekle (%90-110 arası)
                const costVariation = 0.90 + (Math.random() * 0.2);
                const hammadde = Math.floor(avgHammaddePerFactory * costVariation);
                const iscilik = Math.floor(avgIscilikPerFactory * costVariation);
                const enerji = Math.floor(avgEnerjiPerFactory * costVariation);
                const profit = Math.floor((hammadde + iscilik + enerji) * 0.15); // %15 kar
                const budget = Math.floor((hammadde + iscilik + enerji) * 1.1); // %10 fazla bütçe
                
                await promisePool.query(`
                    UPDATE tekstil_dss_yeni.finansal_veriler
                    SET 
                        hammadde_maliyeti = ?,
                        iscilik_maliyeti = ?,
                        enerji_maliyeti = ?,
                        gerceklesen_kar = ?,
                        butcelenen_maliyet = ?
                    WHERE fabrika_id = ? AND veri_ayi = ?
                `, [hammadde, iscilik, enerji, profit, budget, factory.fabrika_id, dateStr]);
                
                updatedCost++;
                
                console.log(`✅ ${factory.fabrika_id} - ${dateStr}: Üretim=${production.toLocaleString('tr-TR')}, Hammadde=${hammadde.toLocaleString('tr-TR')}`);
            }
        }
        
        console.log(`\n✅ ${updatedProd} üretim kaydı ve ${updatedCost} maliyet kaydı güncellendi.\n`);
        
        // Sonuç kontrolü
        const [prodResult] = await promisePool.query(`
            SELECT 
                MONTH(veri_ayi) as ay,
                SUM(aylik_uretim_miktari) as toplam_uretim
            FROM tekstil_dss_yeni.uretim_verileri
            WHERE YEAR(veri_ayi) = 2024
            GROUP BY MONTH(veri_ayi)
            ORDER BY ay
        `);
        
        console.log('📦 Güncellenmiş Aylık Toplam Üretim:');
        prodResult.forEach(r => {
            console.log(`  Ay ${r.ay}: ${Math.floor(r.toplam_uretim).toLocaleString('tr-TR')} adet`);
        });
        
        const [costResult] = await promisePool.query(`
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
        
        console.log('\n💰 Güncellenmiş Aylık Toplam Maliyetler:');
        costResult.forEach(r => {
            console.log(`  Ay ${r.ay}: Hammadde=${Math.floor(r.toplam_hammadde).toLocaleString('tr-TR')}, İşçilik=${Math.floor(r.toplam_iscilik).toLocaleString('tr-TR')}, Enerji=${Math.floor(r.toplam_enerji).toLocaleString('tr-TR')}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

fixAllLast3Months();

