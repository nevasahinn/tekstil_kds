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

async function cleanDuplicates() {
    try {
        console.log('🔍 Tekrarlanan fabrikalar temizleniyor...\n');
        
        // Önce hangi fabrikaları tutacağımızı belirle (en küçük ID'leri)
        const [allFactories] = await promisePool.query(`
            SELECT fabrika_id, fabrika_adi, sehir 
            FROM tekstil_dss_yeni.fabrikalar 
            ORDER BY fabrika_adi, fabrika_id
        `);
        
        // Her fabrika için sadece ilk ID'yi tut
        const keepIds = [];
        const seen = new Set();
        
        allFactories.forEach(f => {
            const key = `${f.fabrika_adi}-${f.sehir}`;
            if (!seen.has(key)) {
                seen.add(key);
                keepIds.push(f.fabrika_id);
            }
        });
        
        console.log(`✅ Tutulacak fabrika ID'leri: ${keepIds.join(', ')}\n`);
        
        // Diğer fabrikaları silmeden önce, ilişkili verileri kontrol et
        const [toDelete] = await promisePool.query(`
            SELECT fabrika_id 
            FROM tekstil_dss_yeni.fabrikalar 
            WHERE fabrika_id NOT IN (?)
        `, [keepIds]);
        
        const deleteIds = toDelete.map(f => f.fabrika_id);
        
        if (deleteIds.length === 0) {
            console.log('✅ Tekrarlanan kayıt bulunamadı.');
            process.exit(0);
        }
        
        console.log(`⚠️  Silinecek fabrika ID'leri: ${deleteIds.join(', ')}\n`);
        console.log('⚠️  DİKKAT: Bu işlem geri alınamaz!');
        console.log('⚠️  İlişkili veriler (üretim, ihracat, finansal) silinecek!\n');
        
        // İlişkili verileri sil
        console.log('1️⃣  İlişkili veriler temizleniyor...');
        
        await promisePool.query(`
            DELETE FROM tekstil_dss_yeni.uretim_verileri 
            WHERE fabrika_id NOT IN (?)
        `, [keepIds]);
        console.log('   ✅ Üretim verileri temizlendi');
        
        await promisePool.query(`
            DELETE FROM tekstil_dss_yeni.ihracat_verileri 
            WHERE fabrika_id NOT IN (?)
        `, [keepIds]);
        console.log('   ✅ İhracat verileri temizlendi');
        
        await promisePool.query(`
            DELETE FROM tekstil_dss_yeni.finansal_veriler 
            WHERE fabrika_id NOT IN (?)
        `, [keepIds]);
        console.log('   ✅ Finansal veriler temizlendi');
        
        // Fabrikaları sil
        console.log('\n2️⃣  Tekrarlanan fabrikalar siliniyor...');
        await promisePool.query(`
            DELETE FROM tekstil_dss_yeni.fabrikalar 
            WHERE fabrika_id NOT IN (?)
        `, [keepIds]);
        console.log(`   ✅ ${deleteIds.length} fabrika kaydı silindi\n`);
        
        // Sonuç kontrolü
        const [remaining] = await promisePool.query(`
            SELECT fabrika_id, fabrika_adi, sehir 
            FROM tekstil_dss_yeni.fabrikalar 
            ORDER BY fabrika_id
        `);
        
        console.log('✅ Kalan fabrikalar:');
        remaining.forEach(f => {
            console.log(`   ID: ${f.fabrika_id}, Ad: ${f.fabrika_adi}, Şehir: ${f.sehir}`);
        });
        
        console.log('\n✅ Temizleme tamamlandı!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    }
}

cleanDuplicates();

