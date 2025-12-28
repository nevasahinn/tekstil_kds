const db = require('../config/database');
const Production = require('./Production');
const Shipment = require('./Shipment');
const Cost = require('./Cost');
const Factory = require('./Factory');

class Dashboard {
    // Executive Summary verileri
    static async getExecutiveSummary(year = new Date().getFullYear()) {
        // 12 aylık (yıllık) sevkiyat hedefi ve gerçekleşen
        const targets = await Shipment.getYearlyTargets();
        
        // Fabrika performansları
        const factoryPerformance = await Production.getTotalProductionByFactory(year);
        const capacityUtilization = await Production.getCapacityUtilization(null, year);
        
        // En iyi ve en düşük performans
        const allFactories = await Factory.getAll();
        const performanceData = await Promise.all(
            allFactories.map(async (factory) => {
                const production = await Production.getTotalProductionByFactory(year);
                const prod = production.find(p => p.factory_id === factory.id);
                const capacity = await Production.getCapacityUtilization(factory.id, year);
                const cap = capacity.find(c => c.factory_id === factory.id);
                
                return {
                    factory_id: factory.id,
                    factory_name: factory.name,
                    city_name: factory.city_name,
                    total_production: prod?.total_production || 0,
                    capacity_utilization: cap?.capacity_utilization_rate || 0,
                    avg_waste_rate: prod?.avg_waste_rate || 0
                };
            })
        );

        // Kritik uyarılar
        const warnings = await this.getCriticalWarnings(year);

        // Toplam hedef ve gerçekleşen (sayıları doğru parse et)
        const totalTarget = targets.reduce((sum, t) => {
            const val = typeof t.target_quantity === 'string' ? parseFloat(t.target_quantity) : (t.target_quantity || 0);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
        const totalShipped = targets.reduce((sum, t) => {
            const val = typeof t.shipped_quantity === 'string' ? parseFloat(t.shipped_quantity) : (t.shipped_quantity || 0);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

        return {
            year,
            total_target: totalTarget,
            total_shipped: totalShipped,
            achievement_rate: totalTarget > 0 ? ((totalShipped / totalTarget) * 100).toFixed(2) : 0,
            factory_performance: performanceData,
            capacity_utilization_avg: capacityUtilization.length > 0 
                ? (capacityUtilization.reduce((sum, c) => sum + (parseFloat(c.capacity_utilization_rate) || 0), 0) / capacityUtilization.length).toFixed(2)
                : 0,
            best_performer: performanceData.length > 0 
                ? performanceData.reduce((best, current) => 
                    parseFloat(current.capacity_utilization) > parseFloat(best.capacity_utilization) ? current : best
                  )
                : null,
            worst_performer: performanceData.length > 0 
                ? performanceData.reduce((worst, current) => 
                    parseFloat(current.capacity_utilization) < parseFloat(worst.capacity_utilization) ? current : worst
                  )
                : null,
            warnings: warnings
        };
    }

    // Kritik uyarılar
    static async getCriticalWarnings(year = new Date().getFullYear()) {
        const warnings = [];

        // Kapasite yetersizliği kontrolü
        const capacityData = await Production.getCapacityUtilization(null, year);
        capacityData.forEach(cap => {
            if (parseFloat(cap.capacity_utilization_rate) > 90) {
                warnings.push({
                    type: 'capacity_shortage',
                    factory_id: cap.factory_id,
                    factory_name: cap.factory_name,
                    message: `${cap.factory_name} kapasite kullanımı %${cap.capacity_utilization_rate} - Kritik seviyede!`
                });
            }
        });

        // Yüksek fire oranı
        const productionData = await Production.getTotalProductionByFactory(year);
        productionData.forEach(prod => {
            if (parseFloat(prod.avg_waste_rate) > 5) {
                warnings.push({
                    type: 'high_waste_rate',
                    factory_id: prod.factory_id,
                    factory_name: prod.factory_name,
                    message: `${prod.factory_name} fire oranı %${prod.avg_waste_rate} - Yüksek!`
                });
            }
        });

        // Sevkiyat gecikmeleri
        const delays = await Shipment.getDelays();
        delays.forEach(delay => {
            if (delay.delay_days > 7) {
                warnings.push({
                    type: 'shipment_delay',
                    factory_id: delay.factory_id,
                    factory_name: delay.factory_name,
                    message: `${delay.factory_name} - ${delay.delay_days} gün gecikme!`
                });
            }
        });

        // Maliyet sapması
        const costData = await Cost.getTotalCostByFactory(year);
        costData.forEach(cost => {
            if (parseFloat(cost.total_variance) < -10000) {
                warnings.push({
                    type: 'cost_variance',
                    factory_id: cost.factory_id,
                    factory_name: cost.factory_name,
                    message: `${cost.factory_name} bütçe sapması: ${cost.total_variance.toFixed(2)} TL`
                });
            }
        });

        return warnings;
    }

    // Senaryo simülasyonu - Yeni kot departmanı
    static async simulateNewDepartment(factoryId, departmentName = 'kot') {
        // factoryId'yi integer'a çevir
        const factoryIdInt = parseInt(factoryId);
        if (isNaN(factoryIdInt)) {
            throw new Error('Geçersiz fabrika ID');
        }

        const factory = await Factory.getById(factoryIdInt);
        if (!factory) {
            throw new Error('Fabrika bulunamadı');
        }

        // Mevcut departman kapasitelerini kontrol et
        const departments = await Factory.getWithDepartments(factoryIdInt);
        const existingDept = departments.find(d => d.department_name === departmentName);
        
        if (existingDept) {
            return {
                error: 'Bu departman zaten mevcut',
                factory_id: factoryIdInt,
                factory_name: factory.name
            };
        }

        // Fabrika mevcut kapasitesini ve üretim verilerini al
        const currentYear = new Date().getFullYear();
        const productionData = await Production.getMonthlyProduction(factoryIdInt, null, currentYear);
        const capacityData = await Production.getCapacityUtilization(factoryIdInt, currentYear);
        
        // Mevcut kapasiteyi hesapla
        let currentCapacity = 20000; // Varsayılan
        if (productionData.length > 0) {
            const maxCapacity = Math.max(...productionData.map(p => parseFloat(p.max_capacity || 0)));
            currentCapacity = maxCapacity > 0 ? maxCapacity : 20000;
        } else if (capacityData.length > 0) {
            currentCapacity = parseFloat(capacityData[0].max_capacity || 20000);
        }

        // Departman tipine göre kapasite ve yatırım belirle
        const departmentConfig = {
            'kot': {
                capacity: 15000,
                investmentPerUnit: 350,
                workforcePerUnit: 0.0035
            },
            'penye': {
                capacity: 12000,
                investmentPerUnit: 280,
                workforcePerUnit: 0.003
            },
            'pamuklu': {
                capacity: 18000,
                investmentPerUnit: 400,
                workforcePerUnit: 0.004
            }
        };

        const config = departmentConfig[departmentName] || departmentConfig['kot'];
        
        // Fabrika ID'sine göre de farklılık ekle (her fabrika farklı büyüklükte)
        const factoryIdMultiplier = 1.0 + (factoryIdInt * 0.05); // Her fabrika için %5 artış
        
        // Fabrika büyüklüğüne göre ölçeklendirme
        const factorySizeMultiplier = currentCapacity > 30000 ? 1.2 : (currentCapacity > 20000 ? 1.1 : 1.0);
        const estimatedCapacity = Math.floor(config.capacity * factorySizeMultiplier * factoryIdMultiplier);
        
        // Yatırım hesaplama - fabrika ID'sine göre de değişken
        const investmentMultiplier = 1.0 + (factoryIdInt * 0.03); // Her fabrika için %3 yatırım farkı
        const estimatedInvestment = estimatedCapacity * config.investmentPerUnit * investmentMultiplier;
        
        // İş gücü hesaplama - fabrika ID'sine göre değişken
        const workforceMultiplier = 1.0 + (factoryIdInt * 0.02);
        const additionalWorkforce = Math.floor(estimatedCapacity * config.workforcePerUnit * workforceMultiplier);
        
        // ROI hesaplama - departman tipine göre farklı kâr marjları
        const profitMargins = {
            'kot': 0.25,      // %25 kâr marjı
            'penye': 0.20,    // %20 kâr marjı
            'pamuklu': 0.30   // %30 kâr marjı
        };
        
        const profitMargin = profitMargins[departmentName] || 0.25;
        const unitPrice = 100; // Varsayılan birim fiyat
        const unitCost = unitPrice * (1 - profitMargin);
        const profitPerUnit = unitPrice - unitCost;
        
        // Yıllık üretim tahmini (kapasitenin %75'i kullanılacak varsayımı)
        const annualProduction = estimatedCapacity * 12 * 0.75;
        const annualProfit = annualProduction * profitPerUnit;
        
        // ROI hesaplama
        const roiYears = annualProfit > 0 ? (estimatedInvestment / annualProfit) : null;

        return {
            factory_id: factoryIdInt,
            factory_name: factory.name,
            new_department: departmentName,
            estimated_capacity_increase: estimatedCapacity,
            estimated_investment: Math.floor(estimatedInvestment),
            additional_workforce: additionalWorkforce,
            roi_years: roiYears && !isNaN(roiYears) && isFinite(roiYears) ? parseFloat(roiYears.toFixed(1)) : null,
            impact_on_shipment_target: Math.floor(annualProduction * 0.9) // %90 verimlilik varsayımı
        };
    }

    // Senaryo simülasyonu - Fabrika genişletme
    static async simulateFactoryExpansion(factoryId, expansionPercentage = 20) {
        // factoryId'yi integer'a çevir
        const factoryIdInt = parseInt(factoryId);
        if (isNaN(factoryIdInt)) {
            throw new Error('Geçersiz fabrika ID');
        }

        const factory = await Factory.getById(factoryIdInt);
        if (!factory) {
            throw new Error('Fabrika bulunamadı');
        }

        // Mevcut kapasiteyi üretim verilerinden al
        const currentYear = new Date().getFullYear();
        const productionData = await Production.getMonthlyProduction(factoryIdInt, null, currentYear);
        const capacityData = await Production.getCapacityUtilization(factoryIdInt, currentYear);
        
        // Maksimum kapasiteyi bul - fabrika ID'sine göre farklı varsayılan değerler
        let currentCapacity = 20000 + (factoryIdInt * 5000); // Her fabrika için farklı başlangıç kapasitesi
        if (productionData.length > 0) {
            const maxCapacity = Math.max(...productionData.map(p => parseFloat(p.max_capacity || 0)));
            currentCapacity = maxCapacity > 0 ? maxCapacity : (20000 + (factoryIdInt * 5000));
        } else if (capacityData.length > 0) {
            currentCapacity = parseFloat(capacityData[0].max_capacity || (20000 + (factoryIdInt * 5000)));
        }
        
        const capacityIncrease = Math.floor(currentCapacity * (expansionPercentage / 100));
        const newCapacity = currentCapacity + capacityIncrease;
        
        // Tahmini maliyetler - fabrika ID'sine göre farklı birim maliyetler
        const baseInvestmentPerUnit = 50;
        const investmentMultiplier = 1.0 + (factoryIdInt * 0.05); // Her fabrika için %5 fark
        const investmentPerUnit = baseInvestmentPerUnit * investmentMultiplier;
        const estimatedInvestment = capacityIncrease * investmentPerUnit;
        
        // İş gücü bilgisini üretim verilerinden al - fabrika ID'sine göre farklı varsayılanlar
        const baseWorkforce = 150;
        const workforceMultiplier = 1.0 + (factoryIdInt * 0.1); // Her fabrika için %10 fark
        const avgWorkforce = productionData.length > 0 
            ? Math.floor(productionData.reduce((sum, p) => sum + (parseFloat(p.workforce) || 0), 0) / productionData.length)
            : Math.floor(baseWorkforce * workforceMultiplier);
        const additionalWorkforce = Math.floor(avgWorkforce * (expansionPercentage / 100));
        
        // Kârlılık projeksiyonu (basit hesaplama)
        const currentProduction = await Production.getTotalProductionByFactory(currentYear);
        const currentProd = currentProduction.find(p => p.factory_id === factoryIdInt);
        
        // String değerleri parse et
        const currentTotalProd = currentProd?.total_production 
            ? (typeof currentProd.total_production === 'string' 
                ? parseFloat(currentProd.total_production.replace(/[^\d.-]/g, '')) 
                : parseFloat(currentProd.total_production))
            : 0;
        
        // Eğer üretim verisi yoksa, kapasiteye göre tahmin et (yıllık üretim)
        const estimatedCurrentProd = currentTotalProd > 0 
            ? currentTotalProd 
            : currentCapacity * 12 * 0.75; // Aylık kapasitenin %75'i * 12 ay
        
        // Yeni kapasiteye göre projeksiyon
        const newCapacityUtilization = 0.75; // Yeni kapasitenin %75'i kullanılacak varsayımı
        const projectedProduction = newCapacity * 12 * newCapacityUtilization;
        const productionIncrease = Math.floor(projectedProduction - estimatedCurrentProd);
        
        // Birim fiyat ve maliyet - fabrika ID'sine göre farklı kâr marjları
        const baseUnitPrice = 100;
        const priceMultiplier = 1.0 + (factoryIdInt * 0.02); // Her fabrika için %2 fiyat farkı
        const unitPrice = baseUnitPrice * priceMultiplier;
        const unitCost = 70 * (1.0 + (factoryIdInt * 0.01)); // Her fabrika için %1 maliyet farkı
        const profitPerUnit = unitPrice - unitCost; // Birim başına kâr
        const projectedProfit = productionIncrease * profitPerUnit;
        
        // ROI hesaplama (yıllık kâr üzerinden)
        const monthlyProfit = projectedProfit / 12;
        const roiYears = monthlyProfit > 0 && isFinite(monthlyProfit) && !isNaN(monthlyProfit)
            ? estimatedInvestment / monthlyProfit 
            : null;

        return {
            factory_id: factoryIdInt,
            factory_name: factory.name,
            current_capacity: currentCapacity,
            expansion_percentage: expansionPercentage,
            new_capacity: newCapacity,
            capacity_increase: capacityIncrease,
            estimated_investment: Math.floor(estimatedInvestment),
            additional_workforce: additionalWorkforce,
            projected_production_increase: Math.floor(productionIncrease),
            projected_profit: Math.floor(projectedProfit),
            roi_years: roiYears && !isNaN(roiYears) && isFinite(roiYears) ? parseFloat(roiYears.toFixed(1)) : null
        };
    }

    // Senaryo simülasyonu - Talep artışı
    static async simulateDemandIncrease(demandIncreasePercentage = 10) {
        const factories = await Factory.getAll();
        const currentYear = new Date().getFullYear();
        
        // Tüm fabrikalar için kapasite verilerini bir kerede al
        const allCapacityData = await Production.getCapacityUtilization(null, currentYear);
        
        const results = factories.map((factory) => {
            // factory.id ile eşleşen kapasite verisini bul
            const cap = allCapacityData.find(c => c.factory_id === factory.id);
            
            // Kapasite kullanım oranını parse et
            let currentUtilization = 0;
            if (cap) {
                // String değeri parse et - direkt parse et, kontrolsüz
                const utilizationStr = cap.capacity_utilization_rate;
                if (utilizationStr) {
                    currentUtilization = parseFloat(utilizationStr);
                }
                
                // Eğer NaN veya 0 ise ve utilizationStr yoksa, üretim ve kapasite verilerinden hesapla
                if ((isNaN(currentUtilization) || currentUtilization === 0) && !utilizationStr) {
                    const maxCapacity = parseFloat(cap.max_capacity || 0);
                    const totalProduction = typeof cap.total_production === 'string'
                        ? parseFloat(cap.total_production)
                        : parseFloat(cap.total_production || 0);
                    if (maxCapacity > 0 && totalProduction > 0) {
                        // Yıllık üretim / (maksimum kapasite * 12 ay) * 100
                        currentUtilization = (totalProduction / (maxCapacity * 12)) * 100;
                    }
                }
            }
            
            const newDemand = currentUtilization * (1 + demandIncreasePercentage / 100);
            const hasCapacity = newDemand <= 100;
            
            return {
                factory_id: factory.id,
                factory_name: factory.name,
                current_utilization: currentUtilization,
                new_demand_utilization: newDemand,
                has_sufficient_capacity: hasCapacity,
                capacity_shortage: hasCapacity ? 0 : (newDemand - 100),
                recommendation: hasCapacity 
                    ? 'Kapasite yeterli' 
                    : 'Kapasite artışı veya yeni fabrika gerekli'
            };
        });

        return {
            demand_increase_percentage: demandIncreasePercentage,
            factories: results,
            overall_capacity_sufficient: results.every(r => r.has_sufficient_capacity)
        };
    }
}

module.exports = Dashboard;

