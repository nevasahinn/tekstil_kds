let scenarioComparisonChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadFactories();
});

async function loadFactories() {
    try {
        const factories = await FactoryAPI.getAll();
        
        const newDeptSelect = document.getElementById('newDeptFactorySelect');
        const expansionSelect = document.getElementById('expansionFactorySelect');
        
        if (newDeptSelect) {
            newDeptSelect.innerHTML = '<option value="">Fabrika seçin...</option>' +
                factories.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        }
        
        if (expansionSelect) {
            expansionSelect.innerHTML = '<option value="">Fabrika seçin...</option>' +
                factories.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Fabrikalar yüklenirken hata:', error);
    }
}

async function simulateNewDepartment() {
    try {
        const factorySelect = document.getElementById('newDeptFactorySelect');
        const deptTypeSelect = document.getElementById('newDeptTypeSelect');
        const resultDiv = document.getElementById('newDeptResult');
        
        if (!factorySelect || !factorySelect.value) {
            alert('Lütfen bir fabrika seçin');
            return;
        }
        
        const factoryId = parseInt(factorySelect.value);
        const departmentName = deptTypeSelect ? deptTypeSelect.value : 'kot';
        
        // Debug: Seçilen değerleri console'a yazdır
        console.log('Simülasyon Parametreleri:', {
            factoryId: factoryId,
            departmentName: departmentName,
            factoryName: factorySelect.options[factorySelect.selectedIndex]?.text
        });
        
        const data = await DashboardAPI.simulateNewDepartment(factoryId, departmentName);
        
        // Debug: Gelen sonuçları console'a yazdır
        console.log('Simülasyon Sonuçları:', data);
        
        if (data.error) {
            resultDiv.innerHTML = `<div style="color: #ef4444; padding: 1rem; background: #fee2e2; border-radius: 5px;">${data.error}</div>`;
            resultDiv.classList.add('show');
            return;
        }
        
        resultDiv.innerHTML = `
            <h4>Simülasyon Sonuçları</h4>
            <div class="result-item">
                <span class="result-label">Fabrika:</span>
                <span class="result-value">${data.factory_name}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Yeni Departman:</span>
                <span class="result-value">${data.new_department}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Tahmini Kapasite Artışı:</span>
                <span class="result-value">${formatNumber(data.estimated_capacity_increase)} adet</span>
            </div>
            <div class="result-item">
                <span class="result-label">Tahmini Yatırım:</span>
                <span class="result-value">${formatCurrency(data.estimated_investment)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Ek İş Gücü İhtiyacı:</span>
                <span class="result-value">${formatNumber(data.additional_workforce)} kişi</span>
            </div>
            <div class="result-item">
                <span class="result-label">Geri Dönüş Süresi (ROI):</span>
                <span class="result-value">${data.roi_years && !isNaN(data.roi_years) ? data.roi_years.toFixed(1) : '-'} yıl</span>
            </div>
            <div class="result-item">
                <span class="result-label">Sevkiyat Hedefi Üzerindeki Etki:</span>
                <span class="result-value">+${formatNumber(data.impact_on_shipment_target)} adet</span>
            </div>
        `;
        resultDiv.classList.add('show');
        
    } catch (error) {
        console.error('Yeni departman simülasyonu hatası:', error);
        alert('Simülasyon çalıştırılırken bir hata oluştu: ' + error.message);
    }
}

async function simulateFactoryExpansion() {
    try {
        const factorySelect = document.getElementById('expansionFactorySelect');
        const percentageInput = document.getElementById('expansionPercentage');
        const resultDiv = document.getElementById('expansionResult');
        
        if (!factorySelect || !factorySelect.value) {
            alert('Lütfen bir fabrika seçin');
            return;
        }
        
        const factoryId = parseInt(factorySelect.value);
        const expansionPercentage = percentageInput ? parseFloat(percentageInput.value) : 20;
        
        // Debug: Seçilen değerleri console'a yazdır
        console.log('Fabrika Genişletme Simülasyonu Parametreleri:', {
            factoryId: factoryId,
            expansionPercentage: expansionPercentage,
            factoryName: factorySelect.options[factorySelect.selectedIndex]?.text
        });
        
        const response = await DashboardAPI.simulateFactoryExpansion(factoryId, expansionPercentage);
        const data = response.data || response; // API response wrapper kontrolü
        
        // Debug: Gelen sonuçları console'a yazdır
        console.log('Fabrika Genişletme Simülasyonu Sonuçları:', data);
        
        if (!data || !data.factory_name) {
            resultDiv.innerHTML = '<div style="color: #ef4444; padding: 1rem;">Simülasyon sonucu alınamadı</div>';
            resultDiv.classList.add('show');
            return;
        }
        
        // Değerleri güvenli şekilde parse et
        const currentCapacity = parseFloat(data.current_capacity || 0);
        const newCapacity = parseFloat(data.new_capacity || 0);
        const capacityIncrease = parseFloat(data.capacity_increase || 0);
        const estimatedInvestment = parseFloat(data.estimated_investment || 0);
        const additionalWorkforce = parseFloat(data.additional_workforce || 0);
        const projectedProductionIncrease = parseFloat(data.projected_production_increase || 0);
        const projectedProfit = parseFloat(data.projected_profit || 0);
        const roiYears = data.roi_years !== null && data.roi_years !== undefined && !isNaN(data.roi_years) 
            ? parseFloat(data.roi_years) 
            : null;
        
        resultDiv.innerHTML = `
            <h4>Simülasyon Sonuçları</h4>
            <div class="result-item">
                <span class="result-label">Fabrika:</span>
                <span class="result-value">${data.factory_name || '-'}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Mevcut Kapasite:</span>
                <span class="result-value">${formatNumber(currentCapacity)} adet</span>
            </div>
            <div class="result-item">
                <span class="result-label">Yeni Kapasite:</span>
                <span class="result-value">${formatNumber(newCapacity)} adet</span>
            </div>
            <div class="result-item">
                <span class="result-label">Kapasite Artışı:</span>
                <span class="result-value">${formatNumber(capacityIncrease)} adet (${data.expansion_percentage || 0}%)</span>
            </div>
            <div class="result-item">
                <span class="result-label">Tahmini Yatırım:</span>
                <span class="result-value">${formatCurrency(estimatedInvestment)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Ek İş Gücü İhtiyacı:</span>
                <span class="result-value">${formatNumber(additionalWorkforce)} kişi</span>
            </div>
            <div class="result-item">
                <span class="result-label">Tahmini Üretim Artışı:</span>
                <span class="result-value">${formatNumber(projectedProductionIncrease)} adet</span>
            </div>
            <div class="result-item">
                <span class="result-label">Tahmini Kâr:</span>
                <span class="result-value">${formatCurrency(projectedProfit)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Geri Dönüş Süresi (ROI):</span>
                <span class="result-value">${roiYears !== null ? roiYears.toFixed(1) : '-'} yıl</span>
            </div>
        `;
        resultDiv.classList.add('show');
        
    } catch (error) {
        console.error('Fabrika genişletme simülasyonu hatası:', error);
        alert('Simülasyon çalıştırılırken bir hata oluştu: ' + error.message);
    }
}
