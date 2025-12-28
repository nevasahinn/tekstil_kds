let factoryPerformanceChart = null;
let productionTargetChart = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    await loadExecutiveSummary();
    
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
        yearSelect.addEventListener('change', async () => {
            await loadExecutiveSummary();
        });
    }
});

async function loadExecutiveSummary() {
    try {
        const yearSelect = document.getElementById('yearSelect');
        const year = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();
        
        const data = await DashboardAPI.getExecutiveSummary(year);
        const warnings = await DashboardAPI.getCriticalWarnings(year);
        
        // Metrikleri güncelle (sayıları doğru parse et)
        const totalTarget = typeof data.total_target === 'string' ? parseFloat(data.total_target) : (data.total_target || 0);
        const totalShipped = typeof data.total_shipped === 'string' ? parseFloat(data.total_shipped) : (data.total_shipped || 0);
        const achievementRate = typeof data.achievement_rate === 'string' ? parseFloat(data.achievement_rate) : (data.achievement_rate || 0);
        const avgCapacity = typeof data.capacity_utilization_avg === 'string' ? parseFloat(data.capacity_utilization_avg) : (data.capacity_utilization_avg || 0);
        
        document.getElementById('totalTarget').textContent = formatNumber(totalTarget);
        document.getElementById('totalShipped').textContent = formatNumber(totalShipped);
        document.getElementById('achievementRate').textContent = formatPercentage(achievementRate);
        document.getElementById('avgCapacityUtil').textContent = formatPercentage(avgCapacity);
        
        // En iyi ve en düşük performans
        if (data.best_performer) {
            const bestDiv = document.getElementById('bestPerformer');
            const bestCapacity = typeof data.best_performer.capacity_utilization === 'string' 
                ? parseFloat(data.best_performer.capacity_utilization) 
                : (data.best_performer.capacity_utilization || 0);
            bestDiv.innerHTML = `
                <p class="factory-name">${data.best_performer.factory_name || '-'}</p>
                <p class="factory-city">${data.best_performer.city_name || '-'}</p>
                <p class="factory-metric">Kapasite Kullanımı: ${formatPercentage(bestCapacity)}</p>
            `;
        }
        
        if (data.worst_performer) {
            const worstDiv = document.getElementById('worstPerformer');
            const worstCapacity = typeof data.worst_performer.capacity_utilization === 'string' 
                ? parseFloat(data.worst_performer.capacity_utilization) 
                : (data.worst_performer.capacity_utilization || 0);
            worstDiv.innerHTML = `
                <p class="factory-name">${data.worst_performer.factory_name || '-'}</p>
                <p class="factory-city">${data.worst_performer.city_name || '-'}</p>
                <p class="factory-metric">Kapasite Kullanımı: ${formatPercentage(worstCapacity)}</p>
            `;
        }
        
        // Uyarıları göster
        displayWarnings(warnings);
        
        // Fabrika performans grafiği
        updateFactoryPerformanceChart(data.factory_performance);
        
        // 12 aylık hedef vs gerçekleşen üretim grafiği
        await updateProductionTargetChart(year);
        
    } catch (error) {
        console.error('Executive Summary yüklenirken hata:', error);
        alert('Veri yüklenirken bir hata oluştu: ' + error.message);
    }
}

function displayWarnings(warnings) {
    const container = document.getElementById('warningsContainer');
    
    if (!warnings || warnings.length === 0) {
        container.innerHTML = '<p style="color: #10b981; font-weight: 600;">✅ Kritik uyarı bulunmuyor</p>';
        return;
    }
    
    container.innerHTML = warnings.map(warning => `
        <div class="warning-card ${warning.type}">
            <p><strong>${warning.factory_name}</strong></p>
            <p>${warning.message}</p>
        </div>
    `).join('');
}

function updateFactoryPerformanceChart(performanceData) {
    const ctx = document.getElementById('factoryPerformanceChart');
    if (!ctx) return;
    
    const labels = performanceData.map(p => p.factory_name);
    const productionData = performanceData.map(p => p.total_production || 0);
    const capacityData = performanceData.map(p => parseFloat(p.capacity_utilization) || 0);
    
    if (factoryPerformanceChart) {
        factoryPerformanceChart.destroy();
    }
    
    factoryPerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Toplam Üretim (Adet)',
                    data: productionData,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Kapasite Kullanımı (%)',
                    data: capacityData,
                    type: 'line',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Üretim (Adet)'
                    }
                },
                y1: {
                    beginAtZero: true,
                    max: 100,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Kapasite Kullanımı (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

async function updateProductionTargetChart(year) {
    const ctx = document.getElementById('productionTargetChart');
    if (!ctx) return;
    
    try {
        // Tüm fabrikaları al
        const factories = await FactoryAPI.getAll();
        
        // Aylık üretim verilerini al
        const monthlyData = await ProductionAPI.getMonthly({ year: year });
        
        // Fabrika bazlı grupla (hedef = maksimum kapasite, gerçekleşen = toplam üretim)
        const grouped = {};
        
        factories.forEach(factory => {
            const factoryMonthlyData = monthlyData.filter(d => d.factory_id === factory.id);
            
            // Her fabrika için toplam hedef (maksimum kapasite) ve gerçekleşen (üretim) hesapla
            let totalTarget = 0;
            let totalActual = 0;
            
            factoryMonthlyData.forEach(monthData => {
                // Değerleri doğru parse et
                const targetVal = typeof monthData.max_capacity === 'string' ? parseFloat(monthData.max_capacity) : (monthData.max_capacity || 0);
                const actualVal = typeof monthData.produced_quantity === 'string' ? parseFloat(monthData.produced_quantity) : (monthData.produced_quantity || 0);
                totalTarget += isNaN(targetVal) ? 0 : targetVal;
                totalActual += isNaN(actualVal) ? 0 : actualVal;
            });
            
            grouped[factory.name] = {
                target: totalTarget,
                actual: totalActual
            };
        });
        
        const labels = Object.keys(grouped);
        const targetData = labels.map(l => grouped[l].target);
        const actualData = labels.map(l => grouped[l].actual);
        
        if (productionTargetChart) {
            productionTargetChart.destroy();
        }
        
        productionTargetChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Hedef',
                        data: targetData,
                        backgroundColor: 'rgba(102, 126, 234, 0.6)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Gerçekleşen',
                        data: actualData,
                        backgroundColor: 'rgba(16, 185, 129, 0.6)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Miktar (Adet)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += formatNumber(context.parsed.y);
                                return label;
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('12 aylık hedef vs gerçekleşen üretim grafiği oluşturulurken hata:', error);
    }
}

function formatNumber(num) {
    if (isNaN(num) || num === null || num === undefined) return '-';
    return new Intl.NumberFormat('tr-TR').format(Math.round(num));
}

function formatPercentage(num) {
    if (num === null || num === undefined) return '-';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '-';
    return numValue.toFixed(2) + '%';
}

function updateCircularProgress(circleId, textId, percentage) {
    const circle = document.getElementById(circleId);
    const text = document.getElementById(textId);
    if (!circle || !text) return;
    
    const circumference = 226.1946710584651; // 2 * Math.PI * 36
    const offset = circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;
    
    circle.style.strokeDashoffset = offset;
    text.textContent = Math.round(Math.min(Math.max(percentage, 0), 100));
}
