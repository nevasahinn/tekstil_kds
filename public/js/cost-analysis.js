let costDistributionChart = null;
let costPerUnitChart = null;
let costTrendChart = null;
let budgetVarianceChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadFactories();
    await loadCostAnalysis();
    
    const factorySelect = document.getElementById('factorySelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (factorySelect) {
        factorySelect.addEventListener('change', loadCostAnalysis);
    }
    if (yearSelect) {
        yearSelect.addEventListener('change', loadCostAnalysis);
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

async function loadCostAnalysis() {
    try {
        const factorySelect = document.getElementById('factorySelect');
        const yearSelect = document.getElementById('yearSelect');
        const factoryId = factorySelect ? parseInt(factorySelect.value) : null;
        const year = yearSelect ? parseInt(yearSelect.value) : null;
        
        // Fabrika bazlı maliyetler
        const costByFactory = await CostAPI.getByFactory(year);
        updateSummaryMetrics(costByFactory);
        updateCostDistributionChart(costByFactory);
        
        // Adet başı maliyet
        const costPerUnit = await CostAPI.getCostPerUnit(factoryId, year);
        updateCostPerUnitChart(costPerUnit);
        
        // Maliyet trendi
        const costTrends = await CostAPI.getTrends(factoryId, year);
        updateCostTrendChart(costTrends);
        
        // Bütçe sapması
        updateBudgetVarianceChart(costByFactory);
        
        // Tablo - Fabrika bazlı toplam göster
        updateCostTable(costByFactory);
        
    } catch (error) {
        console.error('Maliyet analizi yüklenirken hata:', error);
        alert('Veri yüklenirken bir hata oluştu: ' + error.message);
    }
}

function updateSummaryMetrics(data) {
    if (!data || data.length === 0) {
        document.getElementById('totalRawMaterial').textContent = '-';
        document.getElementById('totalLabor').textContent = '-';
        document.getElementById('totalEnergy').textContent = '-';
        document.getElementById('totalCost').textContent = '-';
        return;
    }
    
    const totalRaw = data.reduce((sum, d) => sum + parseFloat(d.total_raw_material || 0), 0);
    const totalLabor = data.reduce((sum, d) => sum + parseFloat(d.total_labor || 0), 0);
    const totalEnergy = data.reduce((sum, d) => sum + parseFloat(d.total_energy || 0), 0);
    const totalCost = data.reduce((sum, d) => sum + parseFloat(d.total_cost || 0), 0);
    
    document.getElementById('totalRawMaterial').textContent = formatCurrency(totalRaw);
    document.getElementById('totalLabor').textContent = formatCurrency(totalLabor);
    document.getElementById('totalEnergy').textContent = formatCurrency(totalEnergy);
    document.getElementById('totalCost').textContent = formatCurrency(totalCost);
}

function updateCostDistributionChart(data) {
    const ctx = document.getElementById('costDistributionChart');
    if (!ctx || !data || data.length === 0) return;
    
    const labels = data.map(d => d.factory_name || '-');
    const rawMaterial = data.map(d => parseFloat(d.total_raw_material || 0));
    const labor = data.map(d => parseFloat(d.total_labor || 0));
    const energy = data.map(d => parseFloat(d.total_energy || 0));
    const other = data.map(d => parseFloat(d.total_other || 0));
    
    if (costDistributionChart) {
        costDistributionChart.destroy();
    }
    
    costDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Hammadde',
                    data: rawMaterial,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)'
                },
                {
                    label: 'İşçilik',
                    data: labor,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)'
                },
                {
                    label: 'Enerji',
                    data: energy,
                    backgroundColor: 'rgba(245, 158, 11, 0.6)'
                },
                {
                    label: 'Diğer',
                    data: other,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Maliyet (TL)'
                    }
                }
            }
        }
    });
}

function updateCostPerUnitChart(data) {
    const ctx = document.getElementById('costPerUnitChart');
    if (!ctx || !data || data.length === 0) return;
    
    const labels = data.map(d => d.factory_name || 'Bilinmeyen Fabrika');
    const costs = data.map(d => parseFloat(d.cost_per_unit || 0));
    
    if (costPerUnitChart) {
        costPerUnitChart.destroy();
    }
    
    costPerUnitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Adet Başı Maliyet (TL)',
                data: costs,
                backgroundColor: costs.map(c => c < 50 ? 'rgba(16, 185, 129, 0.6)' : c < 80 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
                borderColor: costs.map(c => c < 50 ? 'rgba(16, 185, 129, 1)' : c < 80 ? 'rgba(245, 158, 11, 1)' : 'rgba(239, 68, 68, 1)'),
                borderWidth: 1
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
                        text: 'Maliyet (TL/Adet)'
                    }
                }
            }
        }
    });
}

function updateCostTrendChart(data) {
    const ctx = document.getElementById('costTrendChart');
    if (!ctx || !data || data.length === 0) return;
    
    // Tarih bazlı sıralama (ay sırasına göre)
    const sortedData = [...data].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });
    
    // Ay isimleri
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    const labels = sortedData.map(d => `${monthNames[d.month - 1]} ${d.year}`);
    const rawMaterial = sortedData.map(d => parseFloat(d.raw_material || 0));
    const labor = sortedData.map(d => parseFloat(d.labor || 0));
    const energy = sortedData.map(d => parseFloat(d.energy || 0));
    const other = sortedData.map(d => parseFloat(d.other || 0));
    
    if (costTrendChart) {
        costTrendChart.destroy();
    }
    
    costTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Hammadde',
                    data: rawMaterial,
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'İşçilik',
                    data: labor,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Enerji',
                    data: energy,
                    borderColor: 'rgba(245, 158, 11, 1)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Diğer',
                    data: other,
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
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
                        text: 'Maliyet (TL)'
                    }
                }
            }
        }
    });
}

function updateBudgetVarianceChart(data) {
    const ctx = document.getElementById('budgetVarianceChart');
    if (!ctx || !data || data.length === 0) return;
    
    const labels = data.map(d => d.factory_name || '-');
    const budget = data.map(d => parseFloat(d.total_budget || 0));
    const actual = data.map(d => parseFloat(d.total_cost || 0));
    const variance = data.map(d => parseFloat(d.total_variance || 0));
    
    if (budgetVarianceChart) {
        budgetVarianceChart.destroy();
    }
    
    budgetVarianceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Bütçe',
                    data: budget,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Gerçekleşen',
                    data: actual,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Sapma',
                    data: variance,
                    backgroundColor: variance.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
                    borderColor: variance.map(v => v >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'),
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
                        text: 'Maliyet (TL)'
                    }
                }
            }
        }
    });
}

function updateCostTable(data) {
    const tbody = document.getElementById('costTableBody');
    if (!tbody) return;
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Veri bulunamadı</td></tr>';
        return;
    }
    
    // Fabrika bazlı toplam göster (aylık değil, yıllık toplam)
    tbody.innerHTML = data.map(d => {
        // getTotalCostByFactory döndürdüğü field isimleri: total_raw_material, total_labor, total_energy, total_cost, total_budget, total_variance
        const rawMaterial = parseFloat(d.total_raw_material || d.raw_material_cost || 0);
        const labor = parseFloat(d.total_labor || d.labor_cost || 0);
        const energy = parseFloat(d.total_energy || d.energy_cost || 0);
        const total = parseFloat(d.total_cost || 0);
        const budget = parseFloat(d.total_budget || d.budget_amount || 0);
        const variance = parseFloat(d.total_variance || (budget - total));
        
        return `
        <tr>
            <td>${d.factory_name || '-'}</td>
            <td>${formatCurrency(rawMaterial)}</td>
            <td>${formatCurrency(labor)}</td>
            <td>${formatCurrency(energy)}</td>
            <td>-</td>
            <td>${formatCurrency(total)}</td>
            <td>${formatCurrency(budget)}</td>
            <td style="color: ${variance >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
                ${formatCurrency(variance)}
            </td>
        </tr>
        `;
    }).join('');
}

