# İnvertör Log Analizörü — Masaüstü Uygulaması

İnvertör log dosyalarınızı (.TXT) analiz etmek, görselleştirmek ve kalıcı olarak saklamak için geliştirilmiş profesyonel bir Electron masaüstü uygulamasıdır.

## 🚀 Özellikler

- **Gelişmiş Log Analizi**: 6 farklı sayfada (Genel Bakış, Olay Günlüğü, Veri Günlüğü, Grafikler, Teşhis Raporu, Hata Kodları) derinlemesine analiz.
- **Yerel Depolama (DB)**: Yüklenen tüm loglar `saved_logs/` klasöründe JSON formatında otomatik olarak saklanır.
- **Müşteri ve Cihaz Yönetimi**:
  - Seri numarası bazlı teknik servis notları tutma.
  - Cihaz bazlı müşteri ismi kaydetme (Düzenle/Onayla fonksiyonu ile).
- **Log Geçmişi**: Daha önce analiz edilmiş loglara tek tıkla ulaşım, yeniden yükleme ve PDF dökümü alma.
- **AI Teşhis**: Claude veya Gemini (Google) yapay zeka modelleri ile kök neden analizi ve çözüm önerileri. (API anahtarı gerektirir).
- **Raporlama**: Profesyonel PDF ve Excel (XLSX) dökümleri alma.
- **Akıllı Kilovat (kW) Seçimi**: 7.2 kW ve 11 kW modelleri için otomatik limit ve analiz uyarlaması.

## 📦 Kurulum ve Çalıştırma

Uygulamayı yerelinizde çalıştırmak için aşağıdaki adımları izleyin:

1. **Bağımlılıkları Yükleyin**:
   ```bash
   npm install
   ```

2. **Uygulamayı Başlatın**:
   ```bash
   npm start
   ```

## 🛠️ Teknolojiler

- **Framework**: Electron (Masaüstü Altyapısı)
- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism & Dark Mode), Vanilla JavaScript
- **Grafik**: Chart.js
- **Raporlama**: jsPDF, jsPDF-AutoTable, XLSX (SheetJS)
- **Depolama**: Node.js File System (JSON tabanlı yerel persistence)

## 📁 Proje Yapısı

- `main.js`: Electron ana süreç (pencere yönetimi, IPC handler).
- `preload.js`: Renderer ve Main arasındaki güvenli köprü.
- `src/db.js`: Dosya tabanlı depolama mantığı.
- `log_analyzer.html`: Uygulamanın tüm arayüzü ve istemci tarafı mantığı.
- `saved_logs/`: Analiz edilen logların saklandığı klasör.
- `saved_notes/`: Teknik notlar ve müşteri isimlerinin saklandığı klasör.

---
*Bu proje servis operasyonlarını dijitalleştirmek ve hızlandırmak amacıyla geliştirilmiştir.*
