PROJE AÇIKLAMASI 

Bu projede, tekstil sektöründe faaliyet gösteren çok fabrikalı bir firmanın üretim, sevkiyat ve maliyet verilerini analiz ederek yöneticilerin karar alma süreçlerini destekleyen web tabanlı bir Karar Destek Sistemi (KDS) geliştirdim. Projenin temel amacı, üst düzey yöneticilerin şirketin genel durumunu tek bir ekrandan görebilmesini ve veriye dayalı kararlar alabilmesini sağlamaktır.

Geliştirilen sistem; kapasite yönetimi, üretim planlama, sevkiyat performansı, maliyet kontrolü ve yatırım senaryoları gibi kritik alanlarda analizler sunmaktadır. Node.js ve Express.js kullanılarak geliştirilen backend yapısı, MySQL veritabanı ve Chart.js ile desteklenen görsel dashboard ekranları sayesinde sistem hem teknik olarak güçlü hem de kullanıcı dostu bir yapı kazanmıştır. Bu proje ile yöneticilerin en az yedi farklı stratejik ve operasyonel kararı daha sağlıklı şekilde alabilmesi hedeflenmiştir.

KURULUM ADIMLARI

1. Proje İskeletinin Oluşturulması

Bir proje klasörü oluşturdum.

package.json dosyasını oluşturup (npm init ile) gerekli paketleri projeye dahil ettim.

Yüklediğim Paketler: express (web sunucusu), mysql2 (veritabanı bağlantısı), dotenv (gizli değişkenler için), cors ve body-parser (istekleri işlemek için).

2. Veritabanı ve Tetikleyicilerin (Triggers) Kurulumu
Kodlamadan önce veritabanı mimarisini hazırladım.

Fabrikalar, üretim, sevkiyat ve finansal veriler için ilişkisel tabloları tasarladım


Veri tutarlılığını sağlamak için Trigger (Tetikleyici) mekanizmalarını yazdım (uretim_insert, maliyet_update vb.).

Performans takibi için özel View'lar oluşturdum.

3. Backend Mimarisi (MVC) Kurulumu
Kodları düzenli tutmak için MVC (Model-View-Controller) yapısını kurdum.

Database:Veritabanı bağlantı ayarlarını yaptım.


Models: Veri erişim dosyalarını (Cost.js, Factory.js vb.) oluşturdum.



Controllers: İş mantığını ve hesaplamaları (dashboardController.js vb.) yazdım.



Routes: API endpoint'lerini (api.js) tanımladım.


4. Frontend Geliştirme
Kullanıcı arayüzünü tasarladım.


public/views klasörü altında HTML sayfalarını (index.html, cost-analysis.html) oluşturdum.


 API ENDPOINT LİSTESİ


 Fabrika Yönetimi

| GET | `/api/factories` | Tüm fabrikaların listesini getirir |
| GET | `/api/factories/:id` | ID'si verilen fabrikanın detaylarını getirir |
| GET | `/api/factories/:id/departments` | Belirli bir fabrikanın departmanlarını getirir |
| GET | `/api/factories-all-departments` | Tüm fabrikaları departmanlarıyla birlikte getirir |


Üretim Modülü

| GET | `/api/production/monthly` | Aylık üretim trendlerini getirir |
| GET | `/api/production/by-factory` | Fabrika bazlı toplam üretim verilerini getirir |
| GET | `/api/production/by-department` | Departman bazlı üretim dağılımını getirir |
| GET | `/api/production/capacity-utilization` | Kapasite kullanım oranlarını hesaplar |
| POST | `/api/production` | Yeni üretim verisi ekler veya günceller |


Sevkiyat Modülü

| GET | `/api/shipments/targets` | Yıllık sevkiyat hedeflerini ve gerçekleşmeleri getirir |
| GET | `/api/shipments/delays` | Sevkiyat gecikme analizlerini getirir |
| GET | `/api/shipments/quality` | Kalite kontrol ve iade istatistiklerini getirir |
| GET | `/api/shipments/performance` | Fabrika bazlı sevkiyat performansını getirir |
| POST | `/api/shipments` | Yeni sevkiyat kaydı ekler |


 Maliyet Modülü

| GET | `/api/costs/monthly` | Aylık maliyet giderlerini listeler |
| GET | `/api/costs/by-factory` | Fabrika bazlı toplam maliyetleri getirir |
| GET | `/api/costs/per-unit` | Birim maliyet analizlerini getirir |
| GET | `/api/costs/trends` | Maliyet değişim trendlerini getirir |
| GET | `/api/costs/profitability` | Kârlılık analizlerini getirir |
| POST | `/api/costs` | Yeni maliyet verisi ekler|


Dashboard ve Simülasyonlar

| GET | `/api/dashboard/executive-summary` | Yönetici özeti (KPI) verilerini getirir |
| GET | `/api/dashboard/warnings` | Kritik uyarıları (kapasite aşımı, bütçe sapması vb.) listeler |
| POST | `/api/dashboard/simulate/new-department` | Senaryo 1: Yeni departman açılması simülasyonu |
| POST | `/api/dashboard/simulate/factory-expansion` | Senaryo 2: Fabrika genişletme simülasyonu |
| POST | `/api/dashboard/simulate/demand-increase` | Senaryo 3: Talep artışı simülasyonu |

Vanilla JavaScript ile Backend'den veri çeken (fetch işlemleri) ve Chart.js ile grafikleri çizen kodları yazdım
