const Shipment = require('../models/Shipment');

exports.getYearlyTargets = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const data = await Shipment.getYearlyTargets(start_date, end_date);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getDelays = async (req, res) => {
    try {
        const { factory_id, start_date, end_date } = req.query;
        const data = await Shipment.getDelays(
            factory_id ? parseInt(factory_id) : null,
            start_date,
            end_date
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getQualityStats = async (req, res) => {
    try {
        const { factory_id, start_date, end_date } = req.query;
        const data = await Shipment.getQualityStats(
            factory_id ? parseInt(factory_id) : null,
            start_date,
            end_date
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getFactoryPerformance = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const data = await Shipment.getFactoryPerformance(start_date, end_date);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addShipment = async (req, res) => {
    try {
        const result = await Shipment.addShipment(req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

