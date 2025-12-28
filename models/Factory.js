const db = require('../config/database');

class Factory {
    // Tüm fabrikaları getir
    static async getAll() {
        const [rows] = await db.query(`
            SELECT DISTINCT
                fabrika_id as id,
                fabrika_adi as name,
                sehir as city_name
            FROM tekstil_dss_yeni.fabrikalar
            ORDER BY fabrika_id
        `);
        return rows;
    }

    // ID'ye göre fabrika getir
    static async getById(id) {
        const [rows] = await db.query(`
            SELECT 
                fabrika_id as id,
                fabrika_adi as name,
                sehir as city_name
            FROM tekstil_dss_yeni.fabrikalar
            WHERE fabrika_id = ?
        `, [id]);
        return rows[0];
    }

    // Fabrika ve departman bilgilerini birlikte getir
    static async getWithDepartments(id) {
        // Mevcut veritabanında departman tablosu yok, bu yüzden boş döndürüyoruz
        // Veya performans metriklerinden departman bilgisi çıkarılabilir
        const factory = await this.getById(id);
        return factory ? [factory] : [];
    }

    // Tüm fabrikaları departmanlarıyla birlikte getir
    static async getAllWithDepartments() {
        const [rows] = await db.query(`
            SELECT 
                fabrika_id as factory_id,
                fabrika_adi as factory_name,
                sehir as city_name
            FROM tekstil_dss_yeni.fabrikalar
            ORDER BY fabrika_id
        `);
        return rows;
    }
}

module.exports = Factory;

