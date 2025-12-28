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

async function convertToInnoDB() {
    try {
        console.log('🔄 Tablolar InnoDB engine\'e dönüştürülüyor...\n');
        
        const tables = [
            'fabrikalar',
            'uretim_verileri',
            'ihracat_verileri',
            'finansal_veriler'
        ];
        
        for (const table of tables) {
            try {
                console.log(`📝 ${table} tablosu dönüştürülüyor...`);
                
                await promisePool.query(`
                    ALTER TABLE tekstil_dss_yeni.${table} ENGINE=InnoDB
                `);
                
                console.log(`   ✅ ${table} başarıyla InnoDB'ye dönüştürüldü\n`);
            } catch (error) {
                console.error(`   ❌ ${table} dönüştürülürken hata: ${error.message}\n`);
            }
        }
        
        // Sonuç kontrolü
        console.log('🔍 Dönüşüm sonrası kontrol...\n');
        const [result] = await promisePool.query(`
            SELECT 
                TABLE_NAME,
                ENGINE
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = 'tekstil_dss_yeni'
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        
        console.log('📊 Güncel Durum:\n');
        result.forEach(table => {
            const status = table.ENGINE === 'InnoDB' ? '✅' : '⚠️';
            console.log(`${status} ${table.TABLE_NAME}: ${table.ENGINE}`);
        });
        
        const allInnoDB = result.every(t => t.ENGINE === 'InnoDB');
        
        if (allInnoDB) {
            console.log('\n✅ Tüm tablolar başarıyla InnoDB engine\'e dönüştürüldü!');
        } else {
            console.log('\n⚠️  Bazı tablolar hala InnoDB değil.');
        }
        
        // Foreign key kontrolü
        console.log('\n🔗 Foreign Key kontrolü yapılıyor...\n');
        const [fks] = await promisePool.query(`
            SELECT 
                TABLE_NAME,
                CONSTRAINT_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = 'tekstil_dss_yeni'
            AND REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY TABLE_NAME
        `);
        
        if (fks.length > 0) {
            console.log('✅ Foreign Key\'ler mevcut:\n');
            fks.forEach(fk => {
                console.log(`   ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
            });
        } else {
            console.log('⚠️  Foreign Key bulunamadı. İlişkileri kontrol edin.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

convertToInnoDB();

