const db = require('../config/database');

class Production {
    // Aylık üretim verilerini getir
    static async getMonthlyProduction(factoryId = null, departmentId = null, year = null) {
        let query = `
            SELECT 
                uv.uretim_id as id,
                uv.fabrika_id as factory_id,
                uv.veri_ayi as veri_ayi,
                YEAR(uv.veri_ayi) as year,
                MONTH(uv.veri_ayi) as month,
                uv.aylik_uretim_miktari as produced_quantity,
                uv.maks_kapasite_miktari as max_capacity,
                uv.fire_orani_yuzde as waste_rate,
                uv.makine_kullanim_yuzde as machine_utilization,
                uv.is_gucu_sayisi as workforce,
                f.fabrika_adi as factory_name,
                f.sehir as city_name
            FROM tekstil_dss_yeni.uretim_verileri uv
            JOIN tekstil_dss_yeni.fabrikalar f ON uv.fabrika_id = f.fabrika_id
            WHERE 1=1
        `;
        const params = [];

        if (factoryId) {
            query += ' AND uv.fabrika_id = ?';
            params.push(factoryId);
        }
        if (year) {
            query += ' AND YEAR(uv.veri_ayi) = ?';
            params.push(year);
        }

        query += ' ORDER BY uv.veri_ayi DESC, uv.fabrika_id';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Fabrika bazlı toplam üretim
    static async getTotalProductionByFactory(year = null) {
        let query = `
            SELECT 
                f.fabrika_id as factory_id,
                f.fabrika_adi as factory_name,
                f.sehir as city_name,
                SUM(uv.aylik_uretim_miktari) as total_production,
                AVG(uv.fire_orani_yuzde) as avg_waste_rate,
                AVG(uv.makine_kullanim_yuzde) as avg_machine_utilization
            FROM tekstil_dss_yeni.uretim_verileri uv
            JOIN tekstil_dss_yeni.fabrikalar f ON uv.fabrika_id = f.fabrika_id
            WHERE 1=1
        `;
        const params = [];

        if (year) {
            query += ' AND YEAR(uv.veri_ayi) = ?';
            params.push(year);
        }

        query += ' GROUP BY f.fabrika_id, f.fabrika_adi, f.sehir ORDER BY f.fabrika_id';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Departman bazlı üretim (ihracat verilerinden - departman bazlı sevkiyat = üretim)
    static async getProductionByDepartment(factoryId = null, year = null) {
        let query = `
            SELECT 
                iv.departman_adi as department_name,
                SUM(iv.gerceklesen_sevkiyat_miktari) as total_production,
                COUNT(DISTINCT iv.fabrika_id) as factory_count,
                AVG(iv.kalite_kontrol_gecis_yuzde) as avg_quality_rate
            FROM tekstil_dss_yeni.ihracat_verileri iv
            WHERE 1=1
        `;
        const params = [];

        if (factoryId) {
            query += ' AND iv.fabrika_id = ?';
            params.push(factoryId);
        }
        if (year) {
            query += ' AND YEAR(iv.veri_donemi) = ?';
            params.push(year);
        }

        query += ' GROUP BY iv.departman_adi ORDER BY total_production DESC';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Kapasite kullanım oranı
    static async getCapacityUtilization(factoryId = null, year = null) {
        let query = `
            SELECT 
                f.fabrika_id as factory_id,
                f.fabrika_adi as factory_name,
                f.sehir as city_name,
                MAX(uv.maks_kapasite_miktari) as max_capacity,
                SUM(uv.aylik_uretim_miktari) as total_production,
                AVG(fpm.kapasite_kullanim_yuzde) as capacity_utilization_rate
            FROM tekstil_dss_yeni.fabrikalar f
            LEFT JOIN tekstil_dss_yeni.uretim_verileri uv ON f.fabrika_id = uv.fabrika_id
            LEFT JOIN tekstil_dss_yeni.fabrika_performans_metrikleri fpm ON f.fabrika_id = fpm.fabrika_id
            WHERE 1=1
        `;
        const params = [];

        if (factoryId) {
            query += ' AND f.fabrika_id = ?';
            params.push(factoryId);
        }
        if (year) {
            query += ' AND (YEAR(uv.veri_ayi) = ? OR YEAR(fpm.veri_ayi) = ? OR uv.veri_ayi IS NULL)';
            params.push(year, year);
        }

        query += ' GROUP BY f.fabrika_id, f.fabrika_adi, f.sehir ORDER BY f.fabrika_id';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Üretim verisi ekle/güncelle
    static async upsertProduction(data) {
        const { factory_id, department_id, month, year, produced_quantity, waste_rate, machine_utilization } = data;
        
        const [result] = await db.query(`
            INSERT INTO monthly_production 
            (factory_id, department_id, month, year, produced_quantity, waste_rate, machine_utilization)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            produced_quantity = VALUES(produced_quantity),
            waste_rate = VALUES(waste_rate),
            machine_utilization = VALUES(machine_utilization),
            updated_at = CURRENT_TIMESTAMP
        `, [factory_id, department_id, month, year, produced_quantity, waste_rate, machine_utilization]);
        
        return result;
    }
}

module.exports = Production;

