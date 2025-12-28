const db = require('../config/database');

class Shipment {
    // 12 aylık (yıllık) sevkiyat hedefi ve gerçekleşen (toplam)
    static async getYearlyTargets(startDate = null, endDate = null) {
        let query = `
            SELECT 
                iv.fabrika_id as factory_id,
                iv.departman_adi as department_name,
                f.fabrika_adi as factory_name,
                f.sehir as city_name,
                SUM(iv.hedef_sevkiyat_miktari) as target_quantity,
                SUM(iv.gerceklesen_sevkiyat_miktari) as shipped_quantity,
                (SUM(iv.hedef_sevkiyat_miktari) - SUM(iv.gerceklesen_sevkiyat_miktari)) as remaining_quantity,
                CASE 
                    WHEN SUM(iv.hedef_sevkiyat_miktari) > 0 
                    THEN ROUND((SUM(iv.gerceklesen_sevkiyat_miktari) / SUM(iv.hedef_sevkiyat_miktari)) * 100, 2)
                    ELSE 0
                END as achievement_rate
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            query += ' AND iv.veri_donemi >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND iv.veri_donemi <= ?';
            params.push(endDate);
        }

        query += ' GROUP BY iv.fabrika_id, iv.departman_adi, f.fabrika_adi, f.sehir ORDER BY iv.fabrika_id, iv.departman_adi';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Sevkiyat gecikmeleri
    static async getDelays(factoryId = null, startDate = null, endDate = null) {
        let query = `
            SELECT 
                iv.*,
                iv.departman_adi,
                f.fabrika_adi as factory_name,
                f.sehir as city_name,
                iv.sevkiyat_gecikmeleri_gun as delay_days
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            WHERE iv.sevkiyat_gecikmeleri_gun > 0
        `;
        const params = [];

        if (factoryId) {
            query += ' AND iv.fabrika_id = ?';
            params.push(factoryId);
        }
        if (startDate) {
            query += ' AND iv.veri_donemi >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND iv.veri_donemi <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY iv.sevkiyat_gecikmeleri_gun DESC, iv.veri_donemi DESC';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Kalite kontrol geçmişi
    static async getQualityStats(factoryId = null, startDate = null, endDate = null) {
        let query = `
            SELECT 
                f.fabrika_id as factory_id,
                f.fabrika_adi as factory_name,
                f.sehir as city_name,
                iv.departman_adi as department_name,
                AVG(iv.kalite_kontrol_gecis_yuzde) as avg_quality_pass_rate,
                AVG(iv.musteri_sikayet_sayisi) as avg_complaint_rate,
                COUNT(iv.ihracat_id) as total_shipments
            FROM tekstil_dss_yeni.ihracat_verileri iv
            JOIN tekstil_dss_yeni.fabrikalar f ON iv.fabrika_id = f.fabrika_id
            WHERE 1=1
        `;
        const params = [];

        if (factoryId) {
            query += ' AND iv.fabrika_id = ?';
            params.push(factoryId);
        }
        if (startDate) {
            query += ' AND iv.veri_donemi >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND iv.veri_donemi <= ?';
            params.push(endDate);
        }

        query += ' GROUP BY f.fabrika_id, f.fabrika_adi, f.sehir, iv.departman_adi ORDER BY f.fabrika_id, iv.departman_adi';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Fabrika bazlı sevkiyat performansı
    static async getFactoryPerformance(startDate = null, endDate = null) {
        let query = `
            SELECT 
                f.fabrika_id as factory_id,
                f.fabrika_adi as factory_name,
                f.sehir as city_name,
                SUM(iv.gerceklesen_sevkiyat_miktari) as total_shipped,
                AVG(iv.sevkiyat_gecikmeleri_gun) as avg_delay_days,
                AVG(iv.kalite_kontrol_gecis_yuzde) as avg_quality_rate,
                AVG(iv.musteri_sikayet_sayisi) as avg_complaint_rate,
                COUNT(iv.ihracat_id) as shipment_count
            FROM tekstil_dss_yeni.fabrikalar f
            LEFT JOIN tekstil_dss_yeni.ihracat_verileri iv ON f.fabrika_id = iv.fabrika_id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            query += ' AND (iv.veri_donemi >= ? OR iv.veri_donemi IS NULL)';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND (iv.veri_donemi <= ? OR iv.veri_donemi IS NULL)';
            params.push(endDate);
        }

        query += ' GROUP BY f.fabrika_id, f.fabrika_adi, f.sehir ORDER BY f.fabrika_id';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Sevkiyat ekle
    static async addShipment(data) {
        const { factory_id, veri_donemi, hedef_sevkiyat_miktari, gerceklesen_sevkiyat_miktari, sevkiyat_gecikmeleri_gun, kalite_kontrol_gecis_yuzde, musteri_sikayet_sayisi } = data;
        
        const [result] = await db.query(`
            INSERT INTO tekstil_dss_yeni.ihracat_verileri 
            (fabrika_id, veri_donemi, hedef_sevkiyat_miktari, gerceklesen_sevkiyat_miktari, sevkiyat_gecikmeleri_gun, kalite_kontrol_gecis_yuzde, musteri_sikayet_sayisi)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [factory_id, veri_donemi, hedef_sevkiyat_miktari, gerceklesen_sevkiyat_miktari, sevkiyat_gecikmeleri_gun, kalite_kontrol_gecis_yuzde, musteri_sikayet_sayisi]);
        
        return result;
    }
}

module.exports = Shipment;
