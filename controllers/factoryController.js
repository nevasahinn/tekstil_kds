const Factory = require('../models/Factory');

exports.getAllFactories = async (req, res) => {
    try {
        const factories = await Factory.getAll();
        res.json({ success: true, data: factories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getFactoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const factory = await Factory.getById(id);
        if (!factory) {
            return res.status(404).json({ success: false, error: 'Fabrika bulunamadı' });
        }
        res.json({ success: true, data: factory });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getFactoryWithDepartments = async (req, res) => {
    try {
        const { id } = req.params;
        const factory = await Factory.getWithDepartments(id);
        res.json({ success: true, data: factory });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllWithDepartments = async (req, res) => {
    try {
        const factories = await Factory.getAllWithDepartments();
        res.json({ success: true, data: factories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

