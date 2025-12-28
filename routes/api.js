const express = require('express');
const router = express.Router();

// Controllers
const factoryController = require('../controllers/factoryController');
const productionController = require('../controllers/productionController');
const shipmentController = require('../controllers/shipmentController');
const costController = require('../controllers/costController');
const dashboardController = require('../controllers/dashboardController');

// Factory routes
router.get('/factories', factoryController.getAllFactories);
router.get('/factories/:id', factoryController.getFactoryById);
router.get('/factories/:id/departments', factoryController.getFactoryWithDepartments);
router.get('/factories-all-departments', factoryController.getAllWithDepartments);

// Production routes
router.get('/production/monthly', productionController.getMonthlyProduction);
router.get('/production/by-factory', productionController.getTotalProductionByFactory);
router.get('/production/by-department', productionController.getProductionByDepartment);
router.get('/production/capacity-utilization', productionController.getCapacityUtilization);
router.post('/production', productionController.upsertProduction);

// Shipment routes
router.get('/shipments/targets', shipmentController.getYearlyTargets);
router.get('/shipments/delays', shipmentController.getDelays);
router.get('/shipments/quality', shipmentController.getQualityStats);
router.get('/shipments/performance', shipmentController.getFactoryPerformance);
router.post('/shipments', shipmentController.addShipment);

// Cost routes
router.get('/costs/monthly', costController.getMonthlyCosts);
router.get('/costs/by-factory', costController.getTotalCostByFactory);
router.get('/costs/per-unit', costController.getCostPerUnit);
router.get('/costs/trends', costController.getCostTrends);
router.get('/costs/profitability', costController.getProfitability);
router.post('/costs', costController.upsertCost);

// Dashboard routes
router.get('/dashboard/executive-summary', dashboardController.getExecutiveSummary);
router.get('/dashboard/warnings', dashboardController.getCriticalWarnings);
router.post('/dashboard/simulate/new-department', dashboardController.simulateNewDepartment);
router.post('/dashboard/simulate/factory-expansion', dashboardController.simulateFactoryExpansion);
router.post('/dashboard/simulate/demand-increase', dashboardController.simulateDemandIncrease);

module.exports = router;

