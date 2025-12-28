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

async function addForeignKeys() {
    try {
        console.log('🔗 Foreign Key\'ler ekleniyor...\n');
        
        // Önce mevcut foreign key'leri kontrol et
        const [existingFKs] = await promisePool.query(`
            SELECT 
                CONSTRAINT_NAME,
                TABLE_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = 'tekstil_dss_yeni'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        
        console.log(`Mevcut Foreign Key sayısı: ${existingFKs.length}\n`);
        
        // Foreign key'leri ekle
        const foreignKeys = [
            {
                table: 'uretim_verileri',
                constraint: 'fk_uretim_fabrika',
                column: 'fabrika_id',
                refTable: 'fabrikalar',
                refColumn: 'fabrika_id'
            },
            {
                table: 'ihracat_verileri',
                constraint: 'fk_ihracat_fabrika',
                column: 'fabrika_id',
                refTable: 'fabrikalar',
                refColumn: 'fabrika_id'
            },
            {
                table: 'finansal_veriler',
                constraint: 'fk_finansal_fabrika',
                column: 'fabrika_id',
                refTable: 'fabrikalar',
                refColumn: 'fabrika_id'
            }
        ];
        
        for (const fk of foreignKeys) {
            // Önce mevcut constraint'i kontrol et
            const exists = existingFKs.some(
                efk => efk.TABLE_NAME === fk.table && efk.CONSTRAINT_NAME === fk.constraint
            );
            
            if (exists) {
                console.log(`⚠️  ${fk.constraint} zaten mevcut, atlanıyor...`);
                continue;
            }
            
            try {
                await promisePool.query(`
                    ALTER TABLE tekstil_dss_yeni.${fk.table}
                    ADD CONSTRAINT ${fk.constraint}
                    FOREIGN KEY (${fk.column}) 
                    REFERENCES tekstil_dss_yeni.${fk.refTable}(${fk.refColumn})
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
                `);
                
                console.log(`✅ ${fk.table} -> ${fk.refTable} foreign key eklendi`);
            } catch (error) {
                if (error.code === 'ER_DUP_KEY' || error.code === 'ER_DUP_KEYNAME') {
                    console.log(`⚠️  ${fk.constraint} zaten mevcut`);
                } else {
                    console.error(`❌ ${fk.table} foreign key eklenirken hata: ${error.message}`);
                }
            }
        }
        
        // Sonuç kontrolü
        console.log('\n🔍 Foreign Key kontrolü...\n');
        const [finalFKs] = await promisePool.query(`
            SELECT 
                TABLE_NAME,
                CONSTRAINT_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = 'tekstil_dss_yeni'
            AND REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY TABLE_NAME, CONSTRAINT_NAME
        `);
        
        if (finalFKs.length > 0) {
            console.log('✅ Mevcut Foreign Key\'ler:\n');
            finalFKs.forEach(fk => {
                console.log(`   ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} (${fk.CONSTRAINT_NAME})`);
            });
            console.log(`\n✅ Toplam ${finalFKs.length} foreign key mevcut.`);
        } else {
            console.log('⚠️  Foreign Key bulunamadı.');
        }
        
        // Tablo engine kontrolü
        console.log('\n🔍 Tablo Engine kontrolü...\n');
        const [engines] = await promisePool.query(`
            SELECT 
                TABLE_NAME,
                ENGINE
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = 'tekstil_dss_yeni'
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        
        console.log('📊 Tablo Engine\'leri:\n');
        engines.forEach(t => {
            const status = t.ENGINE === 'InnoDB' ? '✅' : '⚠️';
            console.log(`${status} ${t.TABLE_NAME}: ${t.ENGINE}`);
        });
        
        const allInnoDB = engines.every(t => t.ENGINE === 'InnoDB');
        const hasFKs = finalFKs.length > 0;
        
        if (allInnoDB && hasFKs) {
            console.log('\n✅ Veritabanı ilişkili (InnoDB) yapıda ve foreign key\'ler mevcut!');
        } else if (allInnoDB) {
            console.log('\n⚠️  Tablolar InnoDB ama foreign key\'ler eksik.');
        } else {
            console.log('\n⚠️  Bazı tablolar InnoDB değil.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addForeignKeys();

