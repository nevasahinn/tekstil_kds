let targetChart = null;
let departmentTargetChart = null;
let qualityChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadShipmentAnalysis();
});

async function loadShipmentAnalysis() {
    try {
        const targets = await ShipmentAPI.getYearlyTargets();
        const delays = await ShipmentAPI.getDelays();
        const qualityStats = await ShipmentAPI.getQualityStats();
        
        // Özet metrikler
        updateSummaryMetrics(targets);
        
        // Grafikler
        updateTargetChart(targets);
        updateDepartmentTargetChart(targets);
        updateQualityChart(qualityStats);
        
        // Gecikmeler
        displayDelays(delays);
        displayMostDelayedFactory(delays);
        
        // Tablo
        updateTargetTable(targets);
        
    } catch (error) {
        console.error('Sevkiyat analizi yüklenirken hata:', error);
        alert('Veri yüklenirken bir hata oluştu: ' + error.message);
    }
}

function updateSummaryMetrics(targets) {
    // Sayıları doğru şekilde parse et
    const totalTarget = targets.reduce((sum, t) => {
        const val = typeof t.target_quantity === 'string' ? parseFloat(t.target_quantity) : (t.target_quantity || 0);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);
    
    const totalShipped = targets.reduce((sum, t) => {
        const val = typeof t.shipped_quantity === 'string' ? parseFloat(t.shipped_quantity) : (t.shipped_quantity || 0);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);
    
    const remaining = totalTarget - totalShipped;
    const achievement = totalTarget > 0 ? (totalShipped / totalTarget * 100) : 0;
    
    document.getElementById('totalTarget').textContent = formatNumber(totalTarget);
    document.getElementById('totalShipped').textContent = formatNumber(totalShipped);
    document.getElementById('remainingQuantity').textContent = formatNumber(remaining);
    document.getElementById('overallAchievement').textContent = formatPercentage(achievement);
}

function updateTargetChart(data) {
    const ctx = document.getElementById('targetChart');
    if (!ctx) return;
    
    // Fabrika bazlı grupla (değerleri doğru parse et)
    const grouped = {};
    data.forEach(d => {
        const key = d.factory_name;
        if (!grouped[key]) {
            grouped[key] = { target: 0, shipped: 0 };
        }
        // String kontrolü yap ve parse et
        const targetVal = typeof d.target_quantity === 'string' ? parseFloat(d.target_quantity) : (d.target_quantity || 0);
        const shippedVal = typeof d.shipped_quantity === 'string' ? parseFloat(d.shipped_quantity) : (d.shipped_quantity || 0);
        grouped[key].target += isNaN(targetVal) ? 0 : targetVal;
        grouped[key].shipped += isNaN(shippedVal) ? 0 : shippedVal;
    });
    
    const labels = Object.keys(grouped);
    const targetData = labels.map(l => grouped[l].target);
    const shippedData = labels.map(l => grouped[l].shipped);
    
    if (targetChart) {
        targetChart.destroy();
    }
    
    targetChart = new Chart(ctx, {
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
                    data: shippedData,
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
            }
        }
    });
}

function updateDepartmentTargetChart(data) {
    const ctx = document.getElementById('departmentTargetChart');
    if (!ctx) return;
    
    // Departman bazlı başarı oranı
    const grouped = {};
    data.forEach(d => {
        const key = `${d.factory_name} - ${d.department_name ? d.department_name.charAt(0).toUpperCase() + d.department_name.slice(1) : ''}`;
        grouped[key] = parseFloat(d.achievement_rate) || 0;
    });
    
    const labels = Object.keys(grouped);
    const values = Object.values(grouped);
    
    if (departmentTargetChart) {
        departmentTargetChart.destroy();
    }
    
    departmentTargetChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hedef Gerçekleşme Oranı (%)',
                data: values,
                backgroundColor: values.map(v => v >= 100 ? 'rgba(16, 185, 129, 0.6)' : v >= 80 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
                borderColor: values.map(v => v >= 100 ? 'rgba(16, 185, 129, 1)' : v >= 80 ? 'rgba(245, 158, 11, 1)' : 'rgba(239, 68, 68, 1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 120,
                    title: {
                        display: true,
                        text: 'Başarı Oranı (%)'
                    }
                }
            }
        }
    });
}

function updateQualityChart(data) {
    const ctx = document.getElementById('qualityChart');
    if (!ctx || !data || data.length === 0) return;
    
    const labels = data.map(d => `${d.factory_name} - ${d.department_name ? d.department_name.charAt(0).toUpperCase() + d.department_name.slice(1) : ''}`);
    const qualityRates = data.map(d => parseFloat(d.avg_quality_pass_rate) || 0);
    
    if (qualityChart) {
        qualityChart.destroy();
    }
    
    qualityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kalite Kontrol Geçme Oranı (%)',
                data: qualityRates,
                backgroundColor: qualityRates.map(q => q >= 95 ? 'rgba(16, 185, 129, 0.6)' : q >= 90 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
                borderColor: qualityRates.map(q => q >= 95 ? 'rgba(16, 185, 129, 1)' : q >= 90 ? 'rgba(245, 158, 11, 1)' : 'rgba(239, 68, 68, 1)'),
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
                        text: 'Kalite Oranı (%)'
                    }
                }
            }
        }
    });
}

function displayDelays(delays) {
    const container = document.getElementById('delaysContainer');
    
    if (!delays || delays.length === 0) {
        container.innerHTML = '<p style="color: #10b981; font-weight: 600;">✅ Gecikme bulunmuyor</p>';
        return;
    }
    
    container.innerHTML = delays.map(delay => `
        <div class="warning-card shipment_delay">
            <p><strong>${delay.factory_name} - ${delay.departman_adi ? delay.departman_adi.charAt(0).toUpperCase() + delay.departman_adi.slice(1) : ''}</strong></p>
            <p>Gecikme: ${delay.delay_days} gün</p>
            <p>Dönem: ${delay.veri_donemi ? new Date(delay.veri_donemi).toLocaleDateString('tr-TR') : '-'}</p>
        </div>
    `).join('');
}

function displayMostDelayedFactory(delays) {
    const container = document.getElementById('mostDelayedFactory');
    if (!container) return;
    
    if (!delays || delays.length === 0) {
        container.innerHTML = '<p class="factory-name">✅ Gecikme bulunmuyor</p>';
        return;
    }
    
    // Fabrika bazında gecikmeleri topla
    const factoryDelays = {};
    delays.forEach(delay => {
        const factoryId = delay.fabrika_id || delay.factory_id;
        const factoryName = delay.factory_name || 'Bilinmeyen Fabrika';
        
        if (!factoryDelays[factoryId]) {
            factoryDelays[factoryId] = {
                factory_id: factoryId,
                factory_name: factoryName,
                city_name: delay.city_name || '',
                total_delays: 0,
                max_delay: 0,
                delay_count: 0
            };
        }
        
        const delayDays = typeof delay.delay_days === 'string' ? parseFloat(delay.delay_days) : (delay.delay_days || 0);
        if (!isNaN(delayDays)) {
            factoryDelays[factoryId].total_delays += delayDays;
            factoryDelays[factoryId].max_delay = Math.max(factoryDelays[factoryId].max_delay, delayDays);
            factoryDelays[factoryId].delay_count += 1;
        }
    });
    
    // En çok toplam gecikmesi olan fabrikayı bul
    const factoryArray = Object.values(factoryDelays);
    if (factoryArray.length === 0) {
        container.innerHTML = '<p class="factory-name">Veri bulunamadı</p>';
        return;
    }
    
    const mostDelayed = factoryArray.reduce((max, current) => 
        current.total_delays > max.total_delays ? current : max
    );
    
    const avgDelay = mostDelayed.delay_count > 0 
        ? (mostDelayed.total_delays / mostDelayed.delay_count).toFixed(1) 
        : 0;
    
    container.innerHTML = `
        <p class="factory-name">${mostDelayed.factory_name}</p>
        <p class="factory-city">${mostDelayed.city_name || ''}</p>
        <p class="factory-metric">Toplam Gecikme: ${mostDelayed.total_delays.toFixed(0)} gün</p>
        <p class="factory-metric">Maksimum Gecikme: ${mostDelayed.max_delay.toFixed(0)} gün</p>
        <p class="factory-metric">Ortalama Gecikme: ${avgDelay} gün</p>
        <p class="factory-metric">Gecikme Sayısı: ${mostDelayed.delay_count} adet</p>
    `;
}

function updateTargetTable(data) {
    const tbody = document.getElementById('targetTableBody');
    if (!tbody) return;
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Veri bulunamadı</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(d => {
        // Departman adını düzelt (null, undefined veya boş string kontrolü)
        let deptName = '-';
        if (d.department_name && d.department_name.trim() !== '') {
            deptName = d.department_name.charAt(0).toUpperCase() + d.department_name.slice(1);
        }
        
        return `
        <tr>
            <td>${d.factory_name || '-'}</td>
            <td>${deptName}</td>
            <td>${formatNumber(d.target_quantity)}</td>
            <td>${formatNumber(d.shipped_quantity)}</td>
            <td>${formatNumber(d.remaining_quantity)}</td>
            <td>${formatPercentage(d.achievement_rate)}</td>
        </tr>
        `;
    }).join('');
}

