const Production = require('../models/Production');

exports.getMonthlyProduction = async (req, res) => {
    try {
        const { factory_id, department_id, year } = req.query;
        const data = await Production.getMonthlyProduction(
            factory_id ? parseInt(factory_id) : null,
            department_id ? parseInt(department_id) : null,
            year ? parseInt(year) : null
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getTotalProductionByFactory = async (req, res) => {
    try {
        const { year } = req.query;
        const data = await Production.getTotalProductionByFactory(year ? parseInt(year) : null);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getProductionByDepartment = async (req, res) => {
    try {
        const { factory_id, year } = req.query;
        const data = await Production.getProductionByDepartment(
            factory_id ? parseInt(factory_id) : null,
            year ? parseInt(year) : null
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCapacityUtilization = async (req, res) => {
    try {
        const { factory_id, year } = req.query;
        const data = await Production.getCapacityUtilization(
            factory_id ? parseInt(factory_id) : null,
            year ? parseInt(year) : null
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.upsertProduction = async (req, res) => {
    try {
        const result = await Production.upsertProduction(req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

