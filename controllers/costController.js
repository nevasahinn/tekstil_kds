const Cost = require('../models/Cost');

exports.getMonthlyCosts = async (req, res) => {
    try {
        const { factory_id, department_id, year } = req.query;
        const data = await Cost.getMonthlyCosts(
            factory_id ? parseInt(factory_id) : null,
            department_id ? parseInt(department_id) : null,
            year ? parseInt(year) : null
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getTotalCostByFactory = async (req, res) => {
    try {
        const { year } = req.query;
        const data = await Cost.getTotalCostByFactory(year ? parseInt(year) : null);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCostPerUnit = async (req, res) => {
    try {
        const { factory_id, year } = req.query;
        const data = await Cost.getCostPerUnit(
            factory_id ? parseInt(factory_id) : null,
            year ? parseInt(year) : null
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCostTrends = async (req, res) => {
    try {
        const { factory_id, department_id, year } = req.query;
        const data = await Cost.getCostTrends(
            factory_id ? parseInt(factory_id) : null,
            department_id ? parseInt(department_id) : null,
            year ? parseInt(year) : null
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getProfitability = async (req, res) => {
    try {
        const { factory_id, year, unit_price } = req.query;
        const data = await Cost.getProfitability(
            factory_id ? parseInt(factory_id) : null,
            year ? parseInt(year) : null,
            unit_price ? parseFloat(unit_price) : 100
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.upsertCost = async (req, res) => {
    try {
        const result = await Cost.upsertCost(req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

