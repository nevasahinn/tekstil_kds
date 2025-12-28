const db = require('../config/database');

class Cost {
    // Aylık maliyet verileri
    static async getMonthlyCosts(factoryId = null, departmentId = null, year = null) {
        let query = `
            SELECT 
                fv.finans_id as id,
                fv.fabrika_id as factory_id,
                fv.veri_ayi as veri_ayi,
                YEAR(fv.veri_ayi) as year,
                MONTH(fv.veri_ayi) as month,
                fv.hammadde_maliyeti as raw_material_cost,
                fv.iscilik_maliyeti as labor_cost,
                fv.enerji_maliyeti as energy_cost,
                fv.butcelenen_maliyet as budget_amount,
                (fv.hammadde_maliyeti + fv.iscilik_maliyeti + fv.enerji_maliyeti) as total_cost,
                (fv.butcelenen_maliyet - (fv.hammadde_maliyeti + fv.iscilik_maliyeti + fv.enerji_maliyeti)) as budget_variance,
                f.fabrika_adi as factory_name,
                f.sehir as city_name
            FROM tekstil_dss_yeni.finansal_veriler fv
            JOIN tekstil_dss_yeni.fabrikalar f ON fv.fabrika_id = f.fabrika_id
            WHERE 1=1
        `;
        const params = [];

        if (factoryId) {
            query += ' AND fv.fabrika_id = ?';
            params.push(factoryId);
        }
        if (year) {
            query += ' AND YEAR(fv.veri_ayi) = ?';
            params.push(year);
        }

        query += ' ORDER BY fv.veri_ayi DESC, fv.fabrika_id';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Fabrika bazlı toplam maliyet
    static async getTotalCostByFactory(year = null) {
        let query = `
            SELECT 
                f.fabrika_id as factory_id,
                f.fabrika_adi as factory_name,
                f.sehir as city_name,
                SUM(fv.hammadde_maliyeti) as total_raw_material,
                SUM(fv.iscilik_maliyeti) as total_labor,
                SUM(fv.enerji_maliyeti) as total_energy,
                0 as total_other,
                SUM(fv.hammadde_maliyeti + fv.iscilik_maliyeti + fv.enerji_maliyeti) as total_cost,
                SUM(fv.butcelenen_maliyet) as total_budget,
                SUM(fv.butcelenen_maliyet - (fv.hammadde_maliyeti + fv.iscilik_maliyeti + fv.enerji_maliyeti)) as total_variance
            FROM tekstil_dss_yeni.finansal_veriler fv
            JOIN tekstil_dss_yeni.fabrikalar f ON fv.fabrika_id = f.fabrika_id
            WHERE 1=1
        `;
        const params = [];

        if (year) {
            query += ' AND YEAR(fv.veri_ayi) = ?';
            params.push(year);
        }

        query += ' GROUP BY f.fabrika_id, f.fabrika_adi, f.sehir ORDER BY f.fabrika_id';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Adet başı maliyet
    static async getCostPerUnit(factoryId = null, year = null) {
        let query = `
            SELECT 
                f.fabrika_id as factory_id,
                f.fabrika_adi as factory_name,
                f.sehir as city_name,
                SUM(fv.hammadde_maliyeti + fv.iscilik_maliyeti + fv.enerji_maliyeti) as total_cost,
                SUM(uv.aylik_uretim_miktari) as total_production,
                CASE 
                    WHEN SUM(uv.aylik_uretim_miktari) > 0 
                    THEN ROUND(SUM(fv.hammadde_maliyeti + fv.iscilik_maliyeti + fv.enerji_maliyeti) / SUM(uv.aylik_uretim_miktari), 2)
                    ELSE 0
                END as cost_per_unit
            FROM tekstil_dss_yeni.fabrikalar f
            LEFT JOIN tekstil_dss_yeni.finansal_veriler fv ON f.fabrika_id = fv.fabrika_id AND YEAR(fv.veri_ayi) = COALESCE(?, YEAR(fv.veri_ayi))
            LEFT JOIN tekstil_dss_yeni.uretim_verileri uv ON f.fabrika_id = uv.fabrika_id AND YEAR(uv.veri_ayi) = COALESCE(?, YEAR(uv.veri_ayi)) AND MONTH(uv.veri_ayi) = MONTH(fv.veri_ayi)
            WHERE 1=1
        `;
        const params = [year, year];

        if (factoryId) {
            query += ' AND f.fabrika_id = ?';
            params.push(factoryId);
        }

        query += ' GROUP BY f.fabrika_id, f.fabrika_adi, f.sehir ORDER BY f.fabrika_id';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Maliyet trend analizi
    static async getCostTrends(factoryId = null, departmentId = null, year = null) {
        let query = `
            SELECT 
                MONTH(fv.veri_ayi) as month,
                YEAR(fv.veri_ayi) as year,
                SUM(fv.hammadde_maliyeti) as raw_material,
                SUM(fv.iscilik_maliyeti) as labor,
                SUM(fv.enerji_maliyeti) as energy,
                0 as other,
                SUM(fv.hammadde_maliyeti + fv.iscilik_maliyeti + fv.enerji_maliyeti) as total
            FROM tekstil_dss_yeni.finansal_veriler fv
            WHERE 1=1
        `;
        const params = [];

        if (factoryId) {
            query += ' AND fv.fabrika_id = ?';
            params.push(factoryId);
        }
        if (year) {
            query += ' AND YEAR(fv.veri_ayi) = ?';
            params.push(year);
        }

        query += ' GROUP BY MONTH(fv.veri_ayi), YEAR(fv.veri_ayi) ORDER BY YEAR(fv.veri_ayi), MONTH(fv.veri_ayi)';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Kârlılık analizi
    static async getProfitability(factoryId = null, year = null, unitPrice = 100) {
        let query = `
            SELECT 
                f.fabrika_id as factory_id,
                f.fabrika_adi as factory_name,
                f.sehir as city_name,
                SUM(uv.aylik_uretim_miktari) as total_production,
                SUM(fv.hammadde_maliyeti + fv.iscilik_maliyeti + fv.enerji_maliyeti) as total_cost,
                SUM(uv.aylik_uretim_miktari) * ? as estimated_revenue,
                (SUM(uv.aylik_uretim_miktari) * ?) - SUM(fv.hammadde_maliyeti + fv.iscilik_maliyeti + fv.enerji_maliyeti) as estimated_profit,
                CASE 
                    WHEN SUM(uv.aylik_uretim_miktari) * ? > 0
                    THEN ROUND(((SUM(uv.aylik_uretim_miktari) * ?) - SUM(fv.hammadde_maliyeti + fv.iscilik_maliyeti + fv.enerji_maliyeti)) / (SUM(uv.aylik_uretim_miktari) * ?) * 100, 2)
                    ELSE 0
                END as profit_margin
            FROM tekstil_dss_yeni.fabrikalar f
            LEFT JOIN tekstil_dss_yeni.uretim_verileri uv ON f.fabrika_id = uv.fabrika_id
            LEFT JOIN tekstil_dss_yeni.finansal_veriler fv ON f.fabrika_id = fv.fabrika_id AND YEAR(uv.veri_ayi) = YEAR(fv.veri_ayi) AND MONTH(uv.veri_ayi) = MONTH(fv.veri_ayi)
            WHERE 1=1
        `;
        const params = [unitPrice, unitPrice, unitPrice, unitPrice, unitPrice];

        if (factoryId) {
            query += ' AND f.fabrika_id = ?';
            params.push(factoryId);
        }
        if (year) {
            query += ' AND (YEAR(uv.veri_ayi) = ? OR uv.veri_ayi IS NULL)';
            params.push(year);
        }

        query += ' GROUP BY f.fabrika_id, f.fabrika_adi, f.sehir ORDER BY f.fabrika_id';

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Maliyet ekle/güncelle
    static async upsertCost(data) {
        const { factory_id, veri_ayi, hammadde_maliyeti, iscilik_maliyeti, enerji_maliyeti, butcelenen_maliyet } = data;
        
        const [result] = await db.query(`
            INSERT INTO tekstil_dss_yeni.finansal_veriler 
            (fabrika_id, veri_ayi, hammadde_maliyeti, iscilik_maliyeti, enerji_maliyeti, butcelenen_maliyet)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            hammadde_maliyeti = VALUES(hammadde_maliyeti),
            iscilik_maliyeti = VALUES(iscilik_maliyeti),
            enerji_maliyeti = VALUES(enerji_maliyeti),
            butcelenen_maliyet = VALUES(butcelenen_maliyet)
        `, [factory_id, veri_ayi, hammadde_maliyeti, iscilik_maliyeti, enerji_maliyeti, butcelenen_maliyet]);
        
        return result;
    }
}

module.exports = Cost;
