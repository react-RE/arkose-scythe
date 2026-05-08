# Scythe-Reaper

**CDP-based Arkose Labs JS bundle and API response sniper / CDP tabanlı Arkose Labs JS bundle ve API yanıtı yakalayıcı**

[English](#english) | [Türkçe](#türkçe)

---

## English

### Overview

Scythe-Reaper automates GitHub signup flow to trigger Arkose enforcement and capture JS bundles, API responses, and payloads via Chrome DevTools Protocol.

### How It Works

1. Navigates to `https://github.com/signup`
2. Fills the form and clicks Create account
3. Waits for Arkose enforcement/captcha to load
4. Triggers Audio puzzle → Play buttons inside the game-core iframe
5. Captures all network traffic including `/rtag/audio` MP3 requests
6. Saves JS bundles, API responses, and payloads to disk

### Output

Data is saved to `../arkose-scythe-data/bundles/[ISO_TIMESTAMP]/`:

```
bundles/2026-05-08T12-00-00Z/
├── metadata.json        # Session manifest (success, missing, captures list)
├── js/                  # JS bundles (game-core, enforcement, audio-ui)
├── api/                 # API responses (gfct, gt2, ca, rtag-audio)
├── payloads/            # POST payloads (bda-containing)
└── media/               # MP3 files
```

Collected data is automatically pushed to [arkose-scythe-data](https://github.com/react-RE/arkose-scythe-data).

### Dependencies

- Node.js 22+
- Chromium or Chrome

### Setup

```bash
git clone https://github.com/react-RE/arkose-scythe.git
cd arkose-scythe
npm install
```

### Usage

```bash
# Local with visible browser
node src/scythe.mjs

# Headless mode
SCYTHE_HEADLESS=true node src/scythe.mjs

# Custom Chromium path
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium node src/scythe.mjs
```

### Verification

```bash
node test/sanity.mjs
```

### GitHub Actions

Runs automatically every hour. Workflow: `.github/workflows/reap.yml`

### Architecture

| Module | Role |
|--------|------|
| `forge.mjs` | Chrome launch, CDP session management |
| `sniper.mjs` | Network interceptor (JS/API/payload capture) |
| `hawk.mjs` | Frame tracker (150ms poll for iframe detection) |
| `granary.mjs` | Storage manager |
| `scythe.mjs` | Main orchestrator |

### Disclaimer

This tool is for educational and research purposes only. Users are solely responsible for their use.

### License

AGPL-3.0

---

### Veri Kaynağı

Toplanan verilerin güncel halini görmek için: [github.com/react-RE/arkose-scythe-data](https://github.com/react-RE/arkose-scythe-data)

---

## Türkçe

### Genel Bakış

Scythe-Reaper, GitHub signup akışını otomatikleştirerek Arkose enforcement katmanını tetikler ve JS bundle'ları, API yanıtlarını ve payload'ları Chrome DevTools Protocol üzerinden yakalar.

### Nasıl Çalışır

1. `https://github.com/signup` sayfasına gider
2. Formu doldurup Create account butonuna basar
3. Arkose enforcement/captcha yüklenene kadar bekler
4. Game-core frame'i içinde Audio puzzle → Play butonlarını tetikler
5. `/rtag/audio` MP3 isteği dahil tüm network trafiğini yakalar
6. JS bundle'ları, API yanıtlarını ve payload'ları diske kaydeder

### Çıktılar

Veriler `../arkose-scythe-data/bundles/[ISO_TIMESTAMP]/` altına kaydedilir:

```
bundles/2026-05-08T12-00-00Z/
├── metadata.json        # Session manifest (success, missing, captures listesi)
├── js/                  # JS bundle'lar (game-core, enforcement, audio-ui)
├── api/                 # API yanıtları (gfct, gt2, ca, rtag-audio)
├── payloads/            # POST payload'ları (bda içeren)
└── media/               # MP3 dosyaları
```

Toplanan veriler otomatik olarak [arkose-scythe-data](https://github.com/react-RE/arkose-scythe-data) reposuna push edilir.

### Bağımlılıklar

- Node.js 22+
- Chromium veya Chrome

### Kurulum

```bash
git clone https://github.com/react-RE/arkose-scythe.git
cd arkose-scythe
npm install
```

### Kullanım

```bash
# Yerelde görünür browser ile
node src/scythe.mjs

# Headless mod
SCYTHE_HEADLESS=true node src/scythe.mjs

# Chromium path belirterek
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium node src/scythe.mjs
```

### Doğrulama

```bash
node test/sanity.mjs
```

### GitHub Actions

Her saat başı otomatik çalışır. Workflow: `.github/workflows/reap.yml`

### Mimari

| Modül | Görev |
|-------|-------|
| `forge.mjs` | Chrome başlatma, CDP session yönetimi |
| `sniper.mjs` | Network intercept (JS/API/payload capture) |
| `hawk.mjs` | Frame tracker (150ms poll ile iframe takibi) |
| `granary.mjs` | Storage manager |
| `scythe.mjs` | Ana orchestrator |

### Sorumluluk Reddi

Bu araç yalnızca eğitim ve araştırma amaçlıdır. Kullanımından doğacak her türlü sorumluluk kullanıcıya aittir.

### Lisans

AGPL-3.0
