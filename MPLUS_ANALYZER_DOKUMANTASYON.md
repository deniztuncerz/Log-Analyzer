# MPLUS Log Analyzer — Tam Uygulama Dokümantasyonu

**Sürüm:** v6  
**Format:** Tek dosya HTML uygulaması (95 KB, bağımlılıksız çalışır)  
**Dil:** Türkçe arayüz  
**Hedef Cihaz:** MPLUS 7.2 kW ve 11 kW invertör serileri  

---

## 1. Uygulama Genel Tanımı

MPLUS Log Analyzer, MPLUS marka güneş enerjisi invertörlerinden alınan `.txt` formatındaki ham log dosyalarını tarayıcı tabanlı olarak analiz eden bir tanısal araçtır. Sunucu gerektirmez, internet bağlantısı olmadan çalışır (yalnızca AI teşhis özelliği internet gerektirir). Tek bir HTML dosyasıdır; ek kurulum, framework veya backend yoktur.

### 1.1 Kullanılan Kütüphaneler (CDN üzerinden)

| Kütüphane | Versiyon | Amaç |
|-----------|----------|-------|
| Chart.js | 4.4.1 | Zaman serisi grafikleri |
| XLSX (SheetJS) | 0.18.5 | Excel dosyası üretimi |
| jsPDF | 2.5.1 | PDF raporu oluşturma |
| jsPDF-AutoTable | 3.8.2 | PDF içindeki tablolar |
| Google Fonts | — | DM Sans + DM Mono yazı tipleri |

### 1.2 Renk Paleti (CSS Değişkenleri)

```
--bg:     #f0f2f7   Sayfa arka planı
--s1:     #ffffff   Ana kart/yüzey
--s2:     #f6f8fc   İkincil yüzey
--s3:     #edf0f7   Üçüncül yüzey
--b1:     #dde2ee   Kenarlık (ince)
--b2:     #bfc8db   Kenarlık (orta)
--b3:     #9aa5bc   Kenarlık (kalın)
--acc:    #1a6ef5   Birincil mavi (aksan)
--acc2:   #1355cc   Aksan hover
--red:    #dc2626   Hata/kritik
--amber:  #d97706   Uyarı
--green:  #059669   Normal/başarı
--info:   #0891b2   Bilgi
--txt:    #0f172a   Ana metin
--txt2:   #334155   İkincil metin
--txt3:   #64748b   Üçüncül metin
--txt4:   #94a3b8   Soluk metin/placeholder
```

### 1.3 Tipografi

- **Gövde:** DM Sans (300/400/500/600 ağırlıklar)
- **Monospace/Kod/Sayılar:** DM Mono (300/400/500)

---

## 2. Uygulama Mimarisi

### 2.1 Genel Yapı

```
┌─────────────────────────────────────────────────┐
│ TOPBAR (52px sabit)                             │
│  Logo | Dosya Sekmeleri | kW Seçici | API | PDF │
├──────────────┬──────────────────────────────────┤
│ SIDEBAR      │ SAYFA ALANI                      │
│ (200px)      │ (kalan alan, scroll)              │
│              │                                  │
│ Navigasyon   │  6 sayfa:                        │
│ menüsü       │  Genel Bakış / Olay Günlüğü /    │
│              │  Veri Günlüğü / Grafikler /       │
│              │  Teşhis Raporu / Hata Kodları     │
└──────────────┴──────────────────────────────────┘
```

### 2.2 Uygulama Durumu (Global Değişkenler)

```javascript
let DB = {};          // Yüklü dosyaların tüm verisi: { filename: {serial, evLog, dtLog, an, fname} }
let active = null;    // Aktif olarak görüntülenen dosyanın adı
let CJ = {};          // Chart.js instance'ları: { bat, grid, load, pv }
let curFilt = 'all';  // Olay günlüğü aktif filtresi
let showUniq = true;  // Unique modu açık/kapalı
let curDtFilt = 'all';// Veri günlüğü aktif filtresi
let techNotes = {};   // Teknik servis notları: { serial: "not metni" }
let KW_LIMIT = 7200;  // Aktif cihaz güç limiti (7200 veya 11000)
```

---

## 3. Log Dosyası Formatı ve Ayrıştırma (Parser)

### 3.1 Dosya Formatı

MPLUS invertörlerden alınan `.txt` uzantılı, virgülle ayrılmış değer (CSV benzeri) dosyalar.

**Satır 1 — Seri Numarası:**
```
1400202202000160005535
```
- İlk 2 karakter atlanır (`14`)
- Sonraki 2 karakter `TT` ile değiştirilir (`00` → `TT`)
- Sonraki 11 karakter alınır
- Sonuç: `TT20220200016`
- **Formül:** `serial = 'TT' + raw.substring(4, 15)`

**Satır 2'den itibaren — İki tür veri satırı:**

#### Olay Günlüğü Satırı (Event Log) — 40+ sütun
```
Sütun 1:  Ay
Sütun 2:  Gün
Sütun 3:  Saat
Sütun 4:  Dakika
Sütun 5:  Çalışma Modu (0-11)
Sütun 6-44: Durum bayrakları (0 veya 1)
Sütun 40 veya 45: Fault Code (sayısal, 00=normal)
```

#### Veri Günlüğü Satırı (Data Log) — 14-17 sütun
```
Sütun 1:  Ay
Sütun 2:  Gün
Sütun 3:  Saat
Sütun 4:  Dakika
Sütun 5:  Çalışma Modu
Sütun 6:  PV Voltaj (Vdc)
Sütun 7:  PV Güç (Watt)
Sütun 8:  Şebeke Voltaj (Vac)
Sütun 9:  Şebeke Frekansı (Hz)
Sütun 10: Çıkış Voltajı (Vac)
Sütun 11: Çıkış Gücü (Watt)
Sütun 12: Çıkış Frekansı (Hz)
Sütun 13: Yük Yüzdesi (%)
Sütun 14: Batarya Voltajı RAW (×0.1 ile çarp → gerçek volt)
Sütun 15: Batarya Kapasitesi (%)
```
> **Kritik:** Batarya voltajı `cols[13] * 0.1` ile hesaplanır. Örnek: 456 → 45.6V

### 3.2 Çalışma Modları

| Kod | Ad | Açıklama | CSS Sınıfı |
|-----|----|----------|------------|
| 0 | PowerOn | Açılış testi | mb-test |
| 1 | Test | Self-test | mb-test |
| 2 | Standby | Bekleme | mb-standby |
| 3 | Battery | Batarya ile besleme | mb-bat |
| 4 | Line | Şebeke ile besleme | mb-line |
| 5 | Bypass | Bypass modu | mb-bypass |
| 6 | Fault | Arıza modu | mb-fault |
| 7 | Shutdown | Kapalı | mb-fault |
| 11 | Charger | Şarj modu | mb-charger |

### 3.3 Durum Bayrakları (Sütun → Bayrak Adı)

| Sütun | Bayrak Adı | Tür |
|-------|-----------|-----|
| 6 | PV Loss Warning | Uyarı |
| 7 | Inverter Fault | **Hata** |
| 8 | Bus Over Fault | **Hata** |
| 9 | Bus Under Fault | **Hata** |
| 10 | Bus Soft-start Failure | **Hata** |
| 11 | Line Fail Warning | Uyarı |
| 12 | Output Short-circuit | **Hata** |
| 13 | Inverter Low Fault | **Hata** |
| 14 | Inverter High Fault | **Hata** |
| 15 | Over-Temperature Warning | Uyarı |
| 16 | Fan-Locked | **Hata** |
| 17 | Battery High Warning | Uyarı |
| 18 | Battery Low Warning | Uyarı |
| 20 | Battery Under Warning | Uyarı |
| 21 | Battery De-rating Warning | Uyarı |
| 22 | Overload Warning | **Hata** |
| 23 | EEPROM Warning | Uyarı |
| 24 | Inverter Over-current Fault | **Hata** |
| 25 | Inverter Soft-start Fail | **Hata** |
| 26 | Self-test Fail | **Hata** |
| 27 | Output DC Offset Fault | **Hata** |
| 28 | Battery Disconnect | **Hata** |
| 29 | Current Sensor Fail | **Hata** |
| 37 | Battery Weak Warning | Uyarı |
| 42 | BMS Force Charge | Uyarı |
| 43 | BMS Disable Discharge | Uyarı |
| 44 | BMS Disable Charge | Uyarı |

### 3.4 Olay Şiddeti Belirleme Kuralı

```
mod === 6           → "fault"
herhangi bir HATA bayrağı aktif → "fault"
herhangi bir UYARI bayrağı aktif → "warn"
aksi halde          → "ok"
```

---

## 4. Cihaz Limitleri

### 4.1 Dinamik Limitler (KW_LIMIT'e göre değişen)

```javascript
function getLimits() {
  pvV:    { max: 500,       min: 0,    unit: 'V' }   // PV Voltajı
  gridV:  { max: 280,       min: 90,   unit: 'V' }   // Şebeke Voltajı
  gridHz: { max: 52,        min: 45,   unit: 'Hz' }  // Şebeke Frekansı
  outV:   { max: 241.5,     min: 218.5,unit: 'V' }   // Çıkış Voltajı (230 ±%5)
  outW:   { max: KW_LIMIT,  min: 0,    unit: 'W' }   // Çıkış Gücü (7200 veya 11000)
  batV:   { max: 66,        min: 44,   unit: 'V' }   // Batarya Voltajı
}
```

### 4.2 MPLUS 7.2 kW Teknik Özellikleri

- Nominal Çıkış: 7.200 VA / 7.200 W
- Pik (Surge): 14.400 VA (5 sn)
- Çıkış Voltajı: 230 VAC ±%5
- PV Max Güç: 7.000 W
- PV Max Voc: **500 VDC (kritik limit — aşımı donanım hasarı)**
- MPPT Aralığı: 90–450 VDC
- Batarya: 48 VDC nominal, max solar şarj 100A, max AC şarj 100A
- Aşırı şarj donanım limiti: 63–66 VDC
- Şebeke: UPS modunda 170–280 VAC, Ev modunda 90–280 VAC
- Çalışma sıcaklığı: -10°C ile 50°C

### 4.3 MPLUS 11 kW Teknik Özellikleri

- Nominal Çıkış: 11.000 VA / 11.000 W
- Pik (Surge): 22.000 VA (5 sn)
- Çıkış Voltajı: 230 VAC ±%5
- PV Max Güç: 11.000 W (çift MPPT)
- PV Max Voc: **500 VDC (kritik limit)**
- MPPT Aralığı: 90–450 VDC
- Batarya: 48 VDC nominal, max solar şarj 150A, max AC şarj 150A
- Aşırı şarj donanım limiti: 63–66 VDC
- Şebeke: UPS modunda 170–280 VAC, Ev modunda 90–280 VAC
- Çalışma sıcaklığı: -10°C ile 50°C

---

## 5. Hata ve Uyarı Kodları

### 5.1 Fault Codes (F prefix)

| Kod | Türkçe | İngilizce |
|-----|--------|-----------|
| F01 | Fan kilitli (invertör kapalı) | Fan locked when inverter off |
| F02 | Aşırı sıcaklık | Over temperature |
| F03 | Akü voltajı yüksek | Battery voltage too high |
| F04 | Akü voltajı düşük | Battery voltage too low |
| F05 | Çıkış kısa devresi | Output short circuited |
| F06 | Çıkış voltajı yüksek | Output voltage too high |
| F07 | Aşırı yük zaman aşımı | Overload time out |
| F08 | Bara voltajı yüksek | Bus voltage too high |
| F09 | Bara soft-start başarısız | Bus soft start failed |
| F10 | PV aşırı akım | PV over current |
| F11 | PV aşırı voltaj | PV over voltage |
| F12 | DC-DC aşırı akım | DCDC over current |
| F13 | Akü deşarj aşırı akım | Battery discharge over current |
| F51 | Genel aşırı akım | Over current |
| F52 | Bara voltajı düşük | Bus voltage too low |
| F53 | İnvertör soft-start başarısız | Inverter soft start failed |
| F55 | AC çıkışta DC voltaj | Over DC in AC output |
| F57 | Akım sensörü arızası | Current sensor failed |
| F58 | Çıkış voltajı düşük | Output voltage too low |
| F81 | Bara başlatma hatası | Bus initialization failed |
| F83 | İnvertör başlatma hatası | Inverter initialization failed |

### 5.2 Warning Codes (W prefix)

| Kod | Türkçe | İngilizce |
|-----|--------|-----------|
| W01 | Fan kilitli (invertör açık) | Fan locked when inverter on |
| W02 | Aşırı sıcaklık uyarısı | Over temperature warning |
| W03 | Akü aşırı şarj | Battery over-charged |
| W04 | Düşük akü | Low battery |
| W07 | Aşırı yük | Overload warning |
| W10 | Çıkış gücü azaltma | Output power derating |
| W15 | PV enerjisi düşük | PV energy low |
| W16 | BUS başlangıcında yüksek AC (>280V) | High AC input during BUS soft start |
| W32 | İnvertör-panel iletişim hatası | Communication failure |
| WE9 | Akü eşitleme aktif | Battery equalization |
| W6P | Akü bağlı değil | Battery not connected |

---

## 6. Sayfalar ve Özellikler

### 6.1 Topbar (Üst Çubuk)

**Sol:** Logo (MPLUS ANALYZER v6)  
**Orta:** Dosya sekmeleri — her sekme: renkli durum noktası (kırmızı=FAULT, sarı=UYARI, yeşil=NORMAL) + seri numarası + kapat butonu  
**Sağ (soldan sağa):**
1. **Cihaz kW Seçici:** "11 kW" / "7.2 kW" toggle butonları. Seçim anında tüm limit hesapları, grafikler, PDF/Excel çıktıları güncellenir.
2. **PDF Butonu:** `exportPDF()` — yalnızca dosya yüklüyken görünür
3. **AI Sağlayıcı Seçici:** Claude (Anthropic) / Gemini (Google) dropdown
4. **API KEY girişi:** Şifreli metin alanı, sağlayıcıya göre placeholder değişir
5. **Dosya Yükle Butonu:** Birden fazla `.txt`/`.log` dosyası seçilebilir

**Tek dosya modu:** Yeni dosya yüklendiğinde önceki tüm veriler sıfırlanır, ekran temizlenir.

### 6.2 Sidebar (Sol Menü)

6 navigasyon öğesi:
1. **Genel Bakış** (ov)
2. **Olay Günlüğü** (ev) — fault sayısı rozeti gösterilir
3. **Veri Günlüğü** (dt)
4. **Grafikler** (ch)
5. **Teşhis Raporu** (rca)
6. **Hata Kodları** (fcd)

---

### 6.3 Sayfa 1: Genel Bakış

Her yüklü dosya için bir kart gösterilir. Kart sol kenarlığı durum rengindedir (kırmızı/sarı/yeşil).

**Kart İçeriği (yukarıdan aşağıya):**

**1. Cihaz başlığı:**
- Seri numarası (büyük, monospace)
- Dosya adı ve log tarihi aralığı
- Durum rozeti (FAULT / UYARI / NORMAL)

**2. 4'lü metrik grid:**
- FAULT OLAYI (sayı, kırmızı/yeşil)
- UYARI OLAYI (sayı, sarı)
- LİMİT AŞIMI (sayı, sarı)
- DERİN DEŞARJ (kaç kez %0'a düştü)

**3. Hata Kodu Özeti tablosu** (yalnızca kod varsa görünür):
- Sütunlar: Kod (F-prefix kırmızı pill) | Türkçe Açıklama | Gün Sayısı
- **Unique sayım:** Aynı hata kodu aynı günde kaç kez görülürse görülsün 1 olarak sayılır

**4. Min/Max Değerler vs Cihaz Limitleri tablosu:**

| Parametre | Ölçülen | Limit | Durum |
|-----------|---------|-------|-------|
| Max PV Voltaj | XXX V | Max 500V | Normal / ⚠ AŞILDI |
| Max Şebeke Voltaj | ... | Max 280V | ... |
| Min Şebeke Voltaj | ... | Min 90V | ... |
| Max Şebeke Frekansı | ... | Max 52 Hz | ... |
| Min Şebeke Frekansı | ... | Min 45 Hz | ... |
| Max Batarya Voltaj | ... | Max 66V | ... |
| Min Batarya Voltaj | ... | Min 44V | ... |
| Max Çıkış Gücü | ... | Max KW_LIMIT W | ... |

Aşılan satırlar kırmızı renkte, "⚠ AŞILDI" chip'i ile işaretlenir.

**5. Aktif Bayraklar:**
- Tüm log boyunca aktif olan bayraklar chip olarak listelenir
- Kırmızı chip: hata bayrağı, sarı chip: uyarı bayrağı
- Format: `Bayrak Adı ×Kaç_kez`

**6. Teknik Servis Notu textarea:**
- Kullanıcı servis personeli notunu buraya girer
- `techNotes[serial]` state'ine kaydedilir
- PDF raporuna "TEKNİK SERVİS PERSONELI NOTU" başlığıyla dahil edilir
- Odaklandığında mavi kenarlık animasyonu

---

### 6.4 Sayfa 2: Olay Günlüğü

**Mod Açıklaması Satırı:**  
"PowerOn = Açılış testi · Test = Self-test · Standby = Bekleme · Battery = Batarya ile besleme · Line = Şebeke ile besleme · Fault = Arıza modu"

**Filtre Butonları:** Tümü | ⬤ Fault | ▲ Uyarı | ◎ Bilgi

**Unique Toggle:** "Unique" — açıkken aynı gün içinde aynı bayrak kombinasyonu+FC koduna sahip olaylar tekrar gösterilmez. Unique hesaplaması: `gün|mod|bayraklar(sıralı)|fc` benzersiz anahtarıyla

**Her olay satırı içeriği:**
- **Zaman damgası** (AA/GG SS:DD formatında)
- **Mod rozeti** (renkli: Battery=sarı, Fault=kırmızı, Line=yeşil, Test/PowerOn=gri)
- **Bayrak chip'leri** (kırmızı=hata, sarı=uyarı)
- **Hata kodu chip'i** (format: `F08: Bara voltajı yüksek` — Türkçe açıklamayla birlikte)
- Bayrak yoksa: "Aktif bayrak yok" metni

**Satır rengi:**
- fault: sol kenarlık kırmızı
- warn: sol kenarlık sarı

---

### 6.5 Sayfa 3: Veri Günlüğü

**Başlık yanında:** "Veri Günlüğünü Dışa Aktar" Excel butonu

**Filtre Butonları:** Tümü | ⬤ Fault | ▲ Battery | ◎ Line | ◇ Standby | ⚠ Limit Dışı

- **Limit Dışı filtresi:** PV>500V, Şebeke<90V veya >280V, Şebeke Hz<45 veya >52, Çıkış W>KW_LIMIT, Batarya<44V veya >66V koşullarından herhangi birini sağlayan satırlar

**Tablo sütunları:**
Zaman | Mod | PV V | PV W | Şebeke V | Hz | Çıkış V | Çıkış W | Hz | Yük % | Bat V | Bat %

**Hücre renklendirme:**
- Fault modu satırı: soluk kırmızı arka plan
- Batarya <44.5V: kırmızı yazı
- Batarya <45V: sarı yazı
- Şebeke voltajı limit dışı: kırmızı yazı
- Çıkış gücü >KW_LIMIT: kırmızı yazı
- Batarya %0 (ve bv>1): kırmızı yazı
- Batarya <%10: sarı yazı

**Excel Dışa Aktarma:**
- Aktif filtre ne ise o filtrelenmiş veriyi dışa aktarır
- Başlık satırı sabitlenir (`!freeze` ile)
- Limit dışı hücreler kırmızı arka plan + koyu kırmızı yazı
- Dosya adı: `MPLUS_{serial}_VeriGunlugu_{filtre}_{tarih}.xlsx`

---

### 6.6 Sayfa 4: Grafikler

4 sekme, her birinde Chart.js çizgi grafiği:

#### Sekme 1: Batarya Voltajı & Kapasite
- **Mavi çizgi:** Batarya V (sol eksen)
- **Sarı çizgi:** Kapasite % (sağ eksen)
- **Kırmızı kesik çizgiler:** Max 66V ve Min 44V limitleri

#### Sekme 2: Şebeke & Çıkış Voltajı
- **Yeşil çizgi:** Şebeke Vac
- **Sarı çizgi:** Çıkış Vac
- **Kırmızı kesik çizgiler:** Max 280V ve Min 90V limitleri

#### Sekme 3: Çıkış Gücü & Yük Yüzdesi
- **Mavi çizgi:** Çıkış W (sol eksen)
- **Kırmızı çizgi:** Yük % (sağ eksen)
- **Kırmızı kesik çizgi:** Max KW_LIMIT W limiti

#### Sekme 4: PV Voltaj & Güç
- **Sarı çizgi:** PV V (sol eksen)
- **Yeşil çizgi:** PV W (sağ eksen)
- **Kırmızı kesik çizgiler:** MPPT Max 450V ve MPPT Min 90V

**Performans:** Veriler örneklenir (max 200 nokta), büyük dosyalarda `step = floor(data.length / 200)` adımla alınır.

**Limit aşım kutusu:** Her grafik altında, günlük unique limit aşımları listelenir:
- Format: `03/17 05:36 — MAX AŞIMI: 8334.00 (limit: 7200)`

---

### 6.7 Sayfa 5: Teşhis Raporu

**"AI Teşhis Yap" Butonu** → `runAI()` fonksiyonunu tetikler

**6'lı Metrik Grid:**
Toplam Olay | Fault | Uyarı | Hata Kodu Sayısı | Min Bat V | Limit Aşımı

**Hata Kodu Dağılımı Tablosu** (yalnızca kod varsa):
- F-kodu | Türkçe Açıklama | Kaç gün

**Otomatik Kök Neden Analizi Blokları** (renk kodlu kartlar):

| Durum | Renk | Tetikleyici Koşul |
|-------|------|-------------------|
| danger (kırmızı) | Onaylı Arıza | faults.length > 0 |
| danger | İnverter Güç Katı Arızası | Inverter Fault VEYA Over-current bayrağı |
| danger | DC Offset + Bus Soft-start (Kritik) | Her ikisi birlikte |
| warning | Bus Soft-start Hatası | Yalnızca Bus Soft-start |
| warning | Output DC Offset | Yalnızca DC Offset |
| danger | Bus Aşırı Voltaj (F08) | Bus Over Fault bayrağı |
| danger | Bus Düşük Voltaj (F52) | Bus Under Fault bayrağı |
| warning | Aşırı Isı (Nx) | Over-Temperature bayrağı |
| warning | Derin Batarya Deşarjı | zero > 3 (kaç kez %0) |
| warning | Batarya Aşırı Voltaj | maxBv > 66V |
| warning | Batarya Zayıf | Battery Weak bayrağı |
| warning | PV Voltajı Yüksek | maxPv > 450V |
| success | Kritik Arıza Tespit Edilmedi | Yukarıdakilerin hiçbiri yoksa |

---

### 6.8 Sayfa 6: Hata Kodları

İki tablo: Fault Codes (F) ve Warning Codes (W)

**Sütunlar:** Kod | Türkçe Açıklama | İngilizce Açıklama | Durum

Aktif cihazda görülen kodlar kırmızı arka planla vurgulanır, "Aktif" etiketi gösterilir.

---

## 7. AI Teşhis Özelliği

### 7.1 Desteklenen Sağlayıcılar

| Sağlayıcı | Model | Endpoint |
|-----------|-------|----------|
| Claude (Anthropic) | claude-sonnet-4-20250514 | `https://api.anthropic.com/v1/messages` |
| Gemini (Google) | gemini-2.5-flash-preview-04-17 | `https://generativelanguage.googleapis.com/v1beta/models/...` |

### 7.2 Sistem Talimatı (System Prompt) Mimarisi

Her analiz çağrısından önce yapay zekaya cihaza özel teknik belge gönderilir:

- **KW_LIMIT === 7200** → MPLUS 7.2kW teknik belgesi
- **KW_LIMIT === 11000** → MPLUS 11kW teknik belgesi

Teknik belge içeriği: cihaz güç limitleri, PV/batarya/şebeke parametreleri, tüm F-kodları ve anlamları, kritik eşik değerleri.

### 7.3 Kullanıcı Mesajı (buildAnalysisPrompt)

Gönderilen veri yapısı:
```
=== LOG ANALİZ VERİSİ ===
CİHAZ: {serial} | MODEL: {kW} | DÖNEM: {dr}
TOPLAM OLAY: {n} | VERİ: {n}
FAULT OLAYI: {n} | UYARI: {n}
HATA KODLARI: F07(Aşırı yük zaman aşımı): 1 gün, ...
MIN BATARYA: 51.8V | MAX BATARYA: 56.4V
MAX PV: 422V | MAX ÇIKIŞ: 18487W (limit:7200W)
DERİN DEŞARJ: 14x

KRİTİK OLAYLAR: (max 20 satır)
[03/19 05:12] PowerOn | Bus Soft-start Failure | F00
...

LİMİT AŞIMLARI:
03/17 03:47 - Çıkış Gücü: 8334.0W (limit:7200W)
...
=== VERİ SONU ===

İstenilen bölümler:
1) KÖK NEDEN ANALİZİ
2) ARIZA ZAMAN ÇİZELGESİ
3) ACİL MÜDAHALELER
4) ÖNLEYİCİ BAKIM
```

### 7.4 Gemini'ye Özgü Detaylar

- `systemInstruction: {parts: [{text: systemPrompt}]}` field'ı kullanılır
- Fallback: v1 endpoint ile sistem talimatı kullanıcı mesajına eklenir
- 403 hatası → "API etkinleştirilmemiş" açıklaması gösterilir
- Ağ hatası → CORS engeli uyarısı gösterilir

### 7.5 Claude'a Özgü Detaylar

- Header: `anthropic-dangerous-direct-browser-access: true` (tarayıcıdan doğrudan çağrı için)
- `system` field'ı ayrı gönderilir
- `max_tokens: 2000`

---

## 8. PDF Raporu

### 8.1 İndirme Yöntemi

`jsPDF.output("blob")` → `URL.createObjectURL(blob)` → `<a> link.click()` → `URL.revokeObjectURL()`
> **Not:** `doc.save()` kullanılmaz — tarayıcı CSP/sandbox engeli nedeniyle

### 8.2 PDF İçeriği (sırasıyla)

1. **Header bandı:** Mavi arka plan, beyaz yazı: "MPLUS Invertor Log Analiz Raporu" + kW modeli
2. **Meta bilgi:** Seri numarası, dönem, max çıkış, oluşturma tarihi
3. **Durum banner'ı:** Yeşil (NORMAL) veya kırmızı (FAULT)
4. **6'lı metrik grid:** FAULT OLAYI / UYARI / HATA KODU / DERİN DEŞARJ / MIN BAT V / LİMİT AŞIMI
5. **Hata Kodu Özeti tablosu** (kod varsa)
6. **Min/Max Değer tablosu** — aşılan satırlar kırmızı
7. **Grafikler bölümü (4 grafik):** Offscreen canvas'ta render edilir, `toDataURL('image/png')` ile alınır
   - Her grafik altında limit aşım metinleri
8. **Kritik Olaylar tablosu:** Unique fault/warn olayları — fault satırları kırmızı arka plan
9. **Olay Günlüğü Özeti:** İstatistik satırı + tüm unique olayların tablosu
10. **Teknik Servis Personeli Notu** (girilmişse): açık mavi kart içinde
11. **Kök Neden Analizi:** Her bulgu renk kodlu kart halinde
12. **Footer (tüm sayfalarda):** "MPLUS Log Analyzer v4 - {serial}" + "Sayfa X/Y"

### 8.3 Türkçe Karakter Çözümü

`tp()` / `tr2pdf()` fonksiyonu: jsPDF'in Helvetica fontu Türkçe karakterleri desteklemediği için tüm metinler PDF'e yazılmadan önce ASCII'ye dönüştürülür:
```
ş→s, ğ→g, ü→u, ö→o, ç→c, ı→i
Ş→S, Ğ→G, Ü→U, Ö→O, Ç→C, İ→I
•→-, ×→x, —→-
```

### 8.4 Offscreen Grafik Render

PDF butonu basıldığında grafiklerin görünür olmasına gerek yoktur. Tüm 4 grafik:
1. DOM dışında `document.createElement('canvas')` ile (900×320px) oluşturulur
2. `document.body.appendChild(c)` (pozisyon: -9999px)
3. `new Chart(c.getContext('2d'), ...)` ile çizilir
4. 2 `requestAnimationFrame` beklenip `toDataURL('image/png', 0.95)` alınır
5. Chart destroy edilir, canvas DOM'dan kaldırılır

---

## 9. Excel Dışa Aktarma

### 9.1 Ana Excel Export (exportExcel)

5 sekme içeren Excel dosyası:
1. **Özet:** Cihaz bilgileri, metrikler, min/max değerler
2. **Hata Kodu Özeti:** F-kodu, TR/EN açıklama, gün sayısı (yalnızca kod varsa)
3. **Olaylar (Unique):** Tüm unique olaylar — zaman, mod, bayraklar, hata kodu, açıklama, önem
4. **Veri Günlüğü (Tümü):** Ham veri günlüğü tüm satırlar
5. **Limit Aşımları:** Günlük unique limit aşımları
6. **Hata Kodu Referansı:** Tüm F ve W kodları TR/EN açıklamalarıyla

### 9.2 Veri Günlüğü Excel Export (exportDataLogExcel)

- Aktif filtre uygulanmış veri (Tümü/Fault/Battery/Line/Standby/LimitDışı)
- **Başlık satırı sabitlenir** (`ws['!freeze'] = {xSplit:0, ySplit:1}`)
- **Limit dışı hücreler kırmızı:** `fill: {patternType:'solid', fgColor:{rgb:'FFFCE8E8'}}` + `font: {color:{rgb:'FFDC2626'}, bold:true}`
- `XLSX.writeFile(wb, fname, {cellStyles: true})` ile stil bilgisi korunur
- Dosya adında filtre etiketi bulunur: `MPLUS_{serial}_VeriGunlugu_{filtre}_{tarih}.xlsx`

---

## 10. Veri Analizi Mantığı

### 10.1 Unique Deduplication (dedupEv)

Aynı gün içindeki tekrarlayan aynı olayları filteler:
```
Anahtar = "{ay}-{gün}|{mod}|{bayraklar_sıralı_virgüllü}|{fc}"
```
Her anahtar ilk kez görüldüğünde geçer, sonrakiler `_dup: true` işaretlenir.

### 10.2 Fault Code Frequency (fcCountMap)

```
Anahtar = "{ay}-{gün}|{normalizedFC}"
→ Aynı FC aynı gün kaç kez çıkarsa çıksın 1 gün sayılır
→ FC kodu her zaman 2 haneli: String(fc).padStart(2, '0')
```

### 10.3 Limit İhlali Tespiti (detectLimitViols)

Her veri satırı 5 parametre için limit kontrolünden geçer:
- pvV, gridV, gridHz, outW, batV
- Günlük unique: `"{ay}-{gün}|{parametre}|{max/min}"` anahtarı

### 10.4 Hesaplanan İstatistikler

```
minBv: min batarya voltajı (bv > 1 şartıyla)
maxBv: max batarya voltajı
minBc: min batarya kapasitesi
minGv/maxGv: min/max şebeke voltajı
minGz/maxGz: min/max şebeke frekansı
maxOw: max çıkış gücü
maxPv: max PV voltajı
zero: batarya kapasitesinin %0 olduğu satır sayısı (bv > 1 şartıyla)
dr: log dönemi string'i ("AA/GG – AA/GG")
```

---

## 11. Toast Bildirimleri

Sağ alt köşe, 3 tür:
- `ok` (yeşil sol kenarlık): başarı
- `err` (kırmızı sol kenarlık): hata
- `inf` (mavi sol kenarlık): bilgi

3 saniye sonra otomatik kaybolur. Animasyon: `translateX(120%)` → `translateX(0)` (cubic-bezier).

---

## 12. Dosya Yükleme

- Sürükle-bırak: tüm sayfa `dragover` + `drop` olaylarını dinler
- Dosya seçici: `<input type="file" multiple accept=".txt,.log,.TXT">`
- **Tek dosya modu:** Her yeni yükleme öncesinde `DB = {}`, tüm state sıfırlanır, ekran temizlenir
- Yükleme sonrası: sekmeler, genel bakış, tüm tablolar ve grafikler yeniden render edilir

---

## 13. Navigasyon Akışı

```javascript
go(pageId, navElement)
// Tüm .page elemanlarından .on kaldır
// Hedef sayfaya .on ekle
// Grafik sayfasına geçişte buildCharts() otomatik çağrılır
// Hata kodları sayfasına geçişte renderFaultCodes() çağrılır

itab(panelId, tabElement)
// Grafik sekmesi değişiminde
// Aktif panel/tab güncellenir
// buildCharts() çağrılır
```

---

## 14. Elektron (Masaüstü) Uygulaması

### 14.1 Dosya Yapısı

```
mplus-electron/
├── main.js                  ← Electron ana süreç
├── package.json             ← Bağımlılıklar ve build konfigürasyonu
├── mplus_analyzer_v6.html   ← Uygulama dosyası
├── icon.png                 ← Opsiyonel uygulama ikonu
└── README.md
```

### 14.2 main.js Özellikleri

- `BrowserWindow`: 1440×900, min 900×600, frame:true, show:false başlangıçta
- `ready-to-show` olayında pencere gösterilir (beyaz flash önlemi)
- Menü çubuğu gizlenir
- Dış linkler sistem tarayıcısında açılır (`shell.openExternal`)
- Mac: Dock tıklamasında yeniden pencere açılır

### 14.3 Build Hedefleri

- **Windows:** `nsis` — kurulum sihirbazlı `.exe`, masaüstü ve başlangıç menüsü kısayolları
- **Mac:** `dmg`
- **Linux:** `AppImage`

---

## 15. Mobil Uygulama Geliştirme Rehberi

Bu dokümantasyonu kullanan bir agent mobil uygulama oluştururken şu noktaları dikkate almalıdır:

### 15.1 Platform Önerileri

| Platform | Teknoloji | Neden |
|----------|-----------|-------|
| React Native | JavaScript/TypeScript | Mevcut JS mantığı doğrudan taşınabilir |
| Flutter | Dart | Platform uyumu iyi, performans yüksek |
| Capacitor | HTML+JS → Native | Mevcut HTML uygulaması minimum değişikle |

### 15.2 Taşınması Gereken Ana Mantık

1. **Parser:** `parseLog()` fonksiyonu — tam aynı kalabilir
2. **Analyzer:** `analyze()`, `buildRCA()`, `detectLimitViols()` — tam aynı
3. **Sabitler:** `MODES`, `FLAGS`, `FAULT_CODES`, `WARN_CODES`, `DEVICE_PROMPTS` — tam aynı
4. **Limits:** `getLimits()` — tam aynı

### 15.3 Mobil Uyarlamalar

- **Dosya okuma:** Mobilde dosya seçici için platform native API (React Native: `react-native-document-picker`)
- **Grafikler:** `react-native-chart-kit` veya `victory-native`
- **Excel:** `xlsx` kütüphanesi React Native'de çalışır
- **PDF:** `react-native-pdf-lib` veya `react-native-html-to-pdf`
- **AI çağrıları:** `fetch` API aynı şekilde çalışır

### 15.4 Arayüz Uyarlamaları

- Topbar → bottom navigation veya drawer
- Sidebar → bottom tab bar (5 sekme)
- Tablolar → horizontal scroll veya kart listesi
- Grafikler → tam ekran modal
- Dosya sekmesi sistemi → tek dosya, başlıkta seri numarası

---

## 16. Tüm Fonksiyon Listesi

| Fonksiyon | Açıklama |
|-----------|----------|
| `getLimits()` | KW_LIMIT'e göre cihaz limitlerini döner |
| `setKw(w, btn)` | kW seçimini değiştirir, tüm görünümü günceller |
| `handleFiles(fl)` | Dosya yükleme, parse, render tetikler |
| `parseLog(txt, fname)` | Ham log metnini `{serial, evLog, dtLog, an}` nesnesine dönüştürür |
| `z2(n)` | Sayıyı 2 haneli string'e çevirir (01, 09...) |
| `dedupEv(evs)` | Olay listesini günlük unique'e göre işaretler |
| `analyze(ev, dt)` | Tüm istatistikleri hesaplar, RCA üretir |
| `detectLimitViols(dt)` | Veri günlüğünden günlük unique limit ihlallerini bulur |
| `findChartViol(s, field, max, min)` | Grafik için günlük unique ihlal listesi döner |
| `buildRCA(faults, warns, fm, fcMap, stats)` | Otomatik teşhis bloklarını üretir |
| `renderTabs()` | Topbar dosya sekmelerini yeniden çizer |
| `sel(name)` | Dosya seçimini değiştirir |
| `del(e, name)` | Dosyayı kaldırır |
| `renderOv()` | Genel bakış sayfasını çizer |
| `renderEvents(f)` | Olay listesi için veri hazırlar |
| `filt(type, btn)` | Olay filtresi değiştirir |
| `toggleUniq(el)` | Unique toggle'ı açar/kapar |
| `paintEv()` | Olay listesini DOM'a yazar |
| `filtDt(type, btn)` | Veri günlüğü filtresi değiştirir |
| `exportDataLogExcel()` | Veri günlüğünü Excel olarak indirir |
| `renderData(f)` | Veri tablosunu çizer |
| `killCharts()` | Tüm Chart.js instance'larını yok eder |
| `showViolBox(id, viols)` | Grafik altı ihlal kutusunu günceller |
| `buildCharts()` | 4 grafiği oluşturur veya günceller |
| `renderRCA(f)` | Teşhis raporu sayfasını çizer |
| `renderFaultCodes()` | Hata kodları tablosunu çizer |
| `updateProviderPlaceholder()` | API key placeholder'ını sağlayıcıya göre günceller |
| `buildAnalysisPrompt(f, a)` | AI için analiz metnini oluşturur |
| `callClaude(key, sys, user)` | Claude API çağrısı |
| `callGemini(key, sys, user)` | Gemini API çağrısı |
| `runAI()` | AI teşhis akışını yönetir |
| `md2html(md)` | Markdown'ı HTML'e çevirir (temel) |
| `tr2pdf(s)` | Türkçe karakterleri PDF-safe ASCII'ye çevirir |
| `tp(s)` | `tr2pdf` için kısaltma |
| `renderChartOffscreen(type, ds, lbs, w, h)` | PDF için offscreen canvas chart render |
| `exportPDF()` | Tam PDF raporu üretir ve indirir |
| `exportExcel()` | Ana Excel raporu üretir ve indirir |
| `go(id, el)` | Sayfa navigasyonu |
| `itab(id, btn)` | Grafik sekmesi geçişi |
| `renderAll()` | Aktif dosya için tüm sayfaları yeniden render eder |
| `clearAll()` | Tüm içeriği temizler |
| `loading(on)` | Yükleme çubuğunu gösterir/gizler |
| `toast(msg, type)` | Bildirim gösterir |

---

## 17. Sürüm Geçmişi Özeti

| Sürüm | Önemli Değişiklik |
|-------|------------------|
| v1 | Temel log analizi, olay + veri günlüğü |
| v2 | Koyu tema, çoklu dosya desteği |
| v3 | Aydınlık tema, limit tespiti, F/W kod prefiksleri, PDF/Excel |
| v4 | kW seçici, jsPDF entegrasyonu, offscreen chart render, teknik notlar, Limit Dışı filtresi |
| v5 | PDF tarayıcı engeli çözümü, mod açıklamaları, Excel freeze/kırmızı hücre |
| v6 | Çoklu AI sağlayıcı (Claude + Gemini), gömülü cihaz talimat dosyası, model seçici |
