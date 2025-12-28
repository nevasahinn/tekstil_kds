let capacityChart = null;
let departmentChart = null;
let monthlyTrendChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadFactories();
    await loadFactoryPerformance();
    
    const factorySelect = document.getElementById('factorySelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (factorySelect) {
        factorySelect.addEventListener('change', loadFactoryPerformance);
    }
    if (yearSelect) {
        yearSelect.addEventListener('change', loadFactoryPerformance);
    }
});

async function loadFactories() {
    try {
        const factories = await FactoryAPI.getAll();
        const factorySelect = document.getElementById('factorySelect');
        
        if (factorySelect) {
            factorySelect.innerHTML = '<option value="">Tüm Fabrikalar</option>' +
                factories.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Fabrikalar yüklenirken hata:', error);
    }
}

async function loadFactoryPerformance() {
    try {
        const factorySelect = document.getElementById('factorySelect');
        const yearSelect = document.getElementById('yearSelect');
        const factoryId = factorySelect ? parseInt(factorySelect.value) : null;
        const year = yearSelect ? parseInt(yearSelect.value) : null;
        
        // Kapasite kullanımı
        const capacityData = await ProductionAPI.getCapacityUtilization(factoryId, year);
        updateCapacityChart(capacityData);
        
        // Departman bazlı üretim
        const departmentData = await ProductionAPI.getByDepartment(factoryId, year);
        updateDepartmentChart(departmentData);
        
        // Aylık trend
        const monthlyData = await ProductionAPI.getMonthly(factoryId ? { factory_id: factoryId, year: year } : { year: year });
        updateMonthlyTrendChart(monthlyData);
        
        // Fabrika kartları (monthlyData'dan toplam üretim ve fire oranını hesapla)
        updateFactoryCards(capacityData, monthlyData);
        
        // Tablo
        updatePerformanceTable(departmentData);
        
    } catch (error) {
        console.error('Fabrika performansı yüklenirken hata:', error);
        alert('Veri yüklenirken bir hata oluştu: ' + error.message);
    }
}

function updateCapacityChart(data) {
    const ctx = document.getElementById('capacityChart');
    if (!ctx) return;
    
    const labels = data.map(d => d.factory_name);
    const utilization = data.map(d => parseFloat(d.capacity_utilization_rate) || 0);
    
    if (capacityChart) {
        capacityChart.destroy();
    }
    
    capacityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kapasite Kullanım Oranı (%)',
                data: utilization,
                backgroundColor: utilization.map(u => u > 90 ? 'rgba(239, 68, 68, 0.6)' : u > 70 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(16, 185, 129, 0.6)'),
                borderColor: utilization.map(u => u > 90 ? 'rgba(239, 68, 68, 1)' : u > 70 ? 'rgba(245, 158, 11, 1)' : 'rgba(16, 185, 129, 1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Kapasite Kullanımı (%)'
                    }
                }
            }
        }
    });
}

function updateDepartmentChart(data) {
    const ctx = document.getElementById('departmentChart');
    if (!ctx) return;
    
    // Departman bazlı göster
    const departmentNames = {
        'kot': 'Kot',
        'penye': 'Penye',
        'pamuklu': 'Pamuklu'
    };
    
    const labels = data.map(d => {
        const deptName = d.department_name ? d.department_name.toLowerCase() : '';
        return departmentNames[deptName] || (d.department_name ? d.department_name.charAt(0).toUpperCase() + d.department_name.slice(1) : 'Bilinmeyen');
    });
    const values = data.map(d => d.total_production || 0);
    
    if (departmentChart) {
        departmentChart.destroy();
    }
    
    departmentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Toplam Üretim (Adet)',
                data: values,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.6)',  // Kot - Mavi
                    'rgba(16, 185, 129, 0.6)',  // Penye - Yeşil
                    'rgba(245, 158, 11, 0.6)'   // Pamuklu - Turuncu
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatNumber(context.parsed);
                            return `${label}: ${value} adet`;
                        }
                    }
                }
            }
        }
    });
}

function updateMonthlyTrendChart(data) {
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;
    
    // Aylık toplam üretim hesapla
    const monthlyTotals = {};
    data.forEach(d => {
        const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
        monthlyTotals[key] = (monthlyTotals[key] || 0) + (d.produced_quantity || 0);
    });
    
    // Tarih bazlı sıralama (ay sırasına göre)
    const sortedKeys = Object.keys(monthlyTotals).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        if (yearA !== yearB) return yearA - yearB;
        return monthA - monthB;
    });
    
    // Label'ları daha okunabilir hale getir (Ay-Yıl formatı)
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const labels = sortedKeys.map(key => {
        const [year, month] = key.split('-').map(Number);
        return `${monthNames[month - 1]} ${year}`;
    });
    const values = sortedKeys.map(key => monthlyTotals[key]);
    
    if (monthlyTrendChart) {
        monthlyTrendChart.destroy();
    }
    
    monthlyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Aylık Toplam Üretim',
                data: values,
                borderColor: 'rgba(102, 126, 234, 1)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Üretim (Adet)'
                    }
                }
            }
        }
    });
}

function updateFactoryCards(capacityData, monthlyData) {
    const container = document.getElementById('factoryCards');
    if (!container) return;
    
    if (!capacityData || capacityData.length === 0) {
        container.innerHTML = '<div class="loading">Veri bulunamadı</div>';
        return;
    }
    
    container.innerHTML = capacityData.map(factory => {
        // monthlyData'dan bu fabrikaya ait verileri filtrele
        const factoryMonthlyData = monthlyData.filter(d => d.factory_id === factory.factory_id);
        
        // Toplam üretim hesapla
        const totalProduction = factoryMonthlyData.reduce((sum, d) => sum + (parseInt(d.produced_quantity) || 0), 0);
        
        // Ortalama fire oranı hesapla
        const wasteRates = factoryMonthlyData
            .map(d => parseFloat(d.waste_rate) || 0)
            .filter(rate => rate > 0);
        const avgWaste = wasteRates.length > 0 
            ? wasteRates.reduce((sum, rate) => sum + rate, 0) / wasteRates.length 
            : 0;
        
        return `
            <div class="factory-card">
                <h4>${factory.factory_name}</h4>
                <div class="metric">
                    <span>Şehir:</span>
                    <span>${factory.city_name}</span>
                </div>
                <div class="metric">
                    <span>Kapasite Kullanımı:</span>
                    <span>${formatPercentage(factory.capacity_utilization_rate)}</span>
                </div>
                <div class="metric">
                    <span>Toplam Üretim:</span>
                    <span>${formatNumber(totalProduction)}</span>
                </div>
                <div class="metric">
                    <span>Ortalama Fire Oranı:</span>
                    <span>${formatPercentage(avgWaste)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function updatePerformanceTable(data) {
    const tbody = document.getElementById('performanceTableBody');
    if (!tbody) return;
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Veri bulunamadı</td></tr>';
        return;
    }
    
    const departmentNames = {
        'kot': 'Kot',
        'penye': 'Penye',
        'pamuklu': 'Pamuklu'
    };
    
    tbody.innerHTML = data.map(d => {
        const deptName = d.department_name ? d.department_name.toLowerCase() : '';
        const displayName = departmentNames[deptName] || (d.department_name ? d.department_name.charAt(0).toUpperCase() + d.department_name.slice(1) : '-');
        return `
        <tr>
            <td>${displayName}</td>
            <td>${d.factory_count || '-'} Fabrika</td>
            <td>${formatNumber(d.total_production)}</td>
            <td>${formatPercentage(d.avg_quality_rate)}</td>
        </tr>
        `;
    }).join('');
}

