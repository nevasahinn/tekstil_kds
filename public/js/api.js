// API Base URL
const API_BASE_URL = '/api';

// API Helper Functions
class API {
    static async get(url) {
        try {
            const response = await fetch(`${API_BASE_URL}${url}`);
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'API hatası');
            }
            return data.data;
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }

    static async post(url, body) {
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'API hatası');
            }
            return data.data;
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }
}

// Factory API
const FactoryAPI = {
    getAll: () => API.get('/factories'),
    getById: (id) => API.get(`/factories/${id}`),
    getWithDepartments: (id) => API.get(`/factories/${id}/departments`),
    getAllWithDepartments: () => API.get('/factories-all-departments')
};

// Production API
const ProductionAPI = {
    getMonthly: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return API.get(`/production/monthly?${query}`);
    },
    getByFactory: (year = null) => {
        const query = year ? `?year=${year}` : '';
        return API.get(`/production/by-factory${query}`);
    },
    getByDepartment: (factoryId = null, year = null) => {
        const params = {};
        if (factoryId) params.factory_id = factoryId;
        if (year) params.year = year;
        const query = new URLSearchParams(params).toString();
        return API.get(`/production/by-department?${query}`);
    },
    getCapacityUtilization: (factoryId = null, year = null) => {
        const params = {};
        if (factoryId) params.factory_id = factoryId;
        if (year) params.year = year;
        const query = new URLSearchParams(params).toString();
        return API.get(`/production/capacity-utilization?${query}`);
    }
};

// Shipment API
const ShipmentAPI = {
    getYearlyTargets: () => API.get('/shipments/targets'),
    getDelays: (factoryId = null) => {
        const query = factoryId ? `?factory_id=${factoryId}` : '';
        return API.get(`/shipments/delays${query}`);
    },
    getQualityStats: (factoryId = null) => {
        const query = factoryId ? `?factory_id=${factoryId}` : '';
        return API.get(`/shipments/quality${query}`);
    },
    getFactoryPerformance: () => API.get('/shipments/performance')
};

// Cost API
const CostAPI = {
    getMonthly: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return API.get(`/costs/monthly?${query}`);
    },
    getByFactory: (year = null) => {
        const query = year ? `?year=${year}` : '';
        return API.get(`/costs/by-factory${query}`);
    },
    getCostPerUnit: (factoryId = null, year = null) => {
        const params = {};
        if (factoryId) params.factory_id = factoryId;
        if (year) params.year = year;
        const query = new URLSearchParams(params).toString();
        return API.get(`/costs/per-unit?${query}`);
    },
    getTrends: (factoryId = null, year = null) => {
        const params = {};
        if (factoryId) params.factory_id = factoryId;
        if (year) params.year = year;
        const query = new URLSearchParams(params).toString();
        return API.get(`/costs/trends?${query}`);
    },
    getProfitability: (factoryId = null, year = null, unitPrice = 100) => {
        const params = { unit_price: unitPrice };
        if (factoryId) params.factory_id = factoryId;
        if (year) params.year = year;
        const query = new URLSearchParams(params).toString();
        return API.get(`/costs/profitability?${query}`);
    }
};

// Dashboard API
const DashboardAPI = {
    getExecutiveSummary: (year = null) => {
        const query = year ? `?year=${year}` : '';
        return API.get(`/dashboard/executive-summary${query}`);
    },
    getCriticalWarnings: (year = null) => {
        const query = year ? `?year=${year}` : '';
        return API.get(`/dashboard/warnings${query}`);
    },
    simulateNewDepartment: (factoryId, departmentName = 'kot') => {
        return API.post('/dashboard/simulate/new-department', {
            factory_id: factoryId,
            department_name: departmentName
        });
    },
    simulateFactoryExpansion: (factoryId, expansionPercentage = 20) => {
        return API.post('/dashboard/simulate/factory-expansion', {
            factory_id: factoryId,
            expansion_percentage: expansionPercentage
        });
    },
    simulateDemandIncrease: (demandIncreasePercentage = 10) => {
        return API.post('/dashboard/simulate/demand-increase', {
            demand_increase_percentage: demandIncreasePercentage
        });
    }
};

// Utility Functions
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '-';
    return new Intl.NumberFormat('tr-TR', {
        maximumFractionDigits: 0
    }).format(Math.round(numValue));
}

function formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '-';
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(numValue));
}

function formatPercentage(num) {
    if (num === null || num === undefined) return '-';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '-';
    return `${numValue.toFixed(2)}%`;
}

