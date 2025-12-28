// Örnek veri ekleme scripti
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

async function insertSampleData() {
    try {
        console.log('📝 Örnek veriler ekleniyor...\n');

        // 1. Fabrikalar ekle
        console.log('1️⃣  Fabrikalar ekleniyor...');
        await promisePool.query(`
            INSERT INTO tekstil_dss_yeni.fabrikalar (fabrika_adi, sehir)
            VALUES 
                ('İstanbul Fabrikası', 'İstanbul'),
                ('Bursa Fabrikası', 'Bursa'),
                ('İzmir Fabrikası', 'İzmir')
            ON DUPLICATE KEY UPDATE fabrika_adi = VALUES(fabrika_adi)
        `);
        console.log('   ✅ 3 fabrika eklendi\n');

        // 2. Üretim verileri ekle (2024 yılı için 9 ay)
        console.log('2️⃣  Üretim verileri ekleniyor (2024 - 9 ay)...');
        const [factories] = await promisePool.query('SELECT fabrika_id FROM tekstil_dss_yeni.fabrikalar');
        
        for (const factory of factories) {
            for (let month = 1; month <= 9; month++) {
                const date = `2024-${String(month).padStart(2, '0')}-01`;
                const production = 10000 + (month * 500) + Math.floor(Math.random() * 2000);
                const maxCapacity = 15000 + (factory.fabrika_id * 5000);
                const wasteRate = 2.5 + (Math.random() * 2.5); // %2.5-5 arası
                const machineUtil = 75 + (Math.random() * 20); // %75-95 arası
                const workforce = 100 + (factory.fabrika_id * 20) + Math.floor(Math.random() * 30);

                await promisePool.query(`
                    INSERT INTO tekstil_dss_yeni.uretim_verileri 
                    (fabrika_id, veri_ayi, aylik_uretim_miktari, maks_kapasite_miktari, fire_orani_yuzde, makine_kullanim_yuzde, is_gucu_sayisi)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    aylik_uretim_miktari = VALUES(aylik_uretim_miktari),
                    fire_orani_yuzde = VALUES(fire_orani_yuzde),
                    makine_kullanim_yuzde = VALUES(makine_kullanim_yuzde)
                `, [factory.fabrika_id, date, production, maxCapacity, wasteRate.toFixed(2), machineUtil.toFixed(2), workforce]);
            }
        }
        console.log(`   ✅ ${factories.length * 9} üretim kaydı eklendi\n`);

        // 3. İhracat verileri ekle (9 aylık dönem için)
        console.log('3️⃣  İhracat verileri ekleniyor...');
        for (const factory of factories) {
            const targetQuantity = 45000 + (factory.fabrika_id * 5000);
            const shippedQuantity = targetQuantity * (0.85 + Math.random() * 0.15); // %85-100 arası
            const delayDays = Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0;
            const qualityRate = 92 + (Math.random() * 6); // %92-98 arası
            const complaintRate = Math.random() * 3; // %0-3 arası

            await promisePool.query(`
                INSERT INTO tekstil_dss_yeni.ihracat_verileri 
                (fabrika_id, veri_donemi, hedef_sevkiyat_miktari, gerceklesen_sevkiyat_miktari, sevkiyat_gecikmeleri_gun, kalite_kontrol_gecis_yuzde, musteri_sikayet_sayisi)
                VALUES (?, '2024-01-01', ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                gerceklesen_sevkiyat_miktari = VALUES(gerceklesen_sevkiyat_miktari),
                sevkiyat_gecikmeleri_gun = VALUES(sevkiyat_gecikmeleri_gun)
            `, [factory.fabrika_id, targetQuantity, Math.floor(shippedQuantity), delayDays, qualityRate.toFixed(2), complaintRate.toFixed(2)]);
        }
        console.log(`   ✅ ${factories.length} ihracat kaydı eklendi\n`);

        // 4. Finansal veriler ekle
        console.log('4️⃣  Finansal veriler ekleniyor...');
        for (const factory of factories) {
            for (let month = 1; month <= 9; month++) {
                const date = `2024-${String(month).padStart(2, '0')}-01`;
                const rawMaterial = 300000 + (month * 20000) + (Math.random() * 50000);
                const labor = 200000 + (factory.fabrika_id * 30000) + (Math.random() * 30000);
                const energy = 50000 + (month * 5000) + (Math.random() * 10000);
                const budget = (rawMaterial + labor + energy) * 1.1; // %10 fazla bütçe
                const profit = (rawMaterial + labor + energy) * 0.15; // %15 kâr

                await promisePool.query(`
                    INSERT INTO tekstil_dss_yeni.finansal_veriler 
                    (fabrika_id, veri_ayi, hammadde_maliyeti, iscilik_maliyeti, enerji_maliyeti, butcelenen_maliyet, gerceklesen_kar)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    hammadde_maliyeti = VALUES(hammadde_maliyeti),
                    iscilik_maliyeti = VALUES(iscilik_maliyeti),
                    enerji_maliyeti = VALUES(enerji_maliyeti)
                `, [factory.fabrika_id, date, Math.floor(rawMaterial), Math.floor(labor), Math.floor(energy), Math.floor(budget), Math.floor(profit)]);
            }
        }
        console.log(`   ✅ ${factories.length * 9} finansal kayıt eklendi\n`);

        // 5. Performans metrikleri - Bu bir VIEW olduğu için otomatik hesaplanacak
        console.log('5️⃣  Performans metrikleri otomatik hesaplanacak (VIEW tablosu)\n');

        console.log('✅ Tüm örnek veriler başarıyla eklendi!\n');
        console.log('🎉 Dashboard\'u yenileyin ve verileri görüntüleyin!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

insertSampleData();

