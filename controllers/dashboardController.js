const Dashboard = require('../models/Dashboard');

exports.getExecutiveSummary = async (req, res) => {
    try {
        const { year } = req.query;
        const data = await Dashboard.getExecutiveSummary(year ? parseInt(year) : new Date().getFullYear());
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCriticalWarnings = async (req, res) => {
    try {
        const { year } = req.query;
        const data = await Dashboard.getCriticalWarnings(year ? parseInt(year) : new Date().getFullYear());
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.simulateNewDepartment = async (req, res) => {
    try {
        const { factory_id, department_name } = req.body;
        if (!factory_id) {
            return res.status(400).json({ success: false, error: 'factory_id gerekli' });
        }
        const data = await Dashboard.simulateNewDepartment(factory_id, department_name || 'kot');
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.simulateFactoryExpansion = async (req, res) => {
    try {
        const { factory_id, expansion_percentage } = req.body;
        if (!factory_id) {
            return res.status(400).json({ success: false, error: 'factory_id gerekli' });
        }
        const data = await Dashboard.simulateFactoryExpansion(
            factory_id, 
            expansion_percentage ? parseFloat(expansion_percentage) : 20
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.simulateDemandIncrease = async (req, res) => {
    try {
        const { demand_increase_percentage } = req.body;
        const data = await Dashboard.simulateDemandIncrease(
            demand_increase_percentage ? parseFloat(demand_increase_percentage) : 10
        );
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

