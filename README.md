# Scythe-Reaper

CDP (Chrome DevTools Protocol) tabanlı Arkose Labs JS bundle ve API yanıtlarını yakalama aracı.

GitHub signup akışını tetikleyip Arkose enforcement katmanının yüklediği kritik bundle'ları, API yanıtlarını ve payload'ları otomatik olarak toplar.

## Nasıl Çalışır

1. `https://github.com/signup` sayfasına gider
2. Formu doldurup Create account butonuna basar
3. Arkose enforcement/captcha yüklenene kadar bekler
4. Game-core frame'i içinde Audio puzzle → Play butonlarını tetikler
5. `/rtag/audio` MP3 isteği dahil tüm network trafiğini yakalar
6. JS bundle'ları, API yanıtlarını ve payload'ları diske kaydeder

## Çıktılar

Veriler `../arkose-scythe-data/bundles/[ISO_TIMESTAMP]/` altına kaydedilir.

```
bundles/2026-05-08T12-00-00Z/
├── metadata.json        # Session manifest (success, missing, captures listesi)
├── js/                  # JS bundle'lar (game-core, enforcement, audio-ui)
├── api/                 # API yanıtları (gfct, gt2, ca, rtag-audio)
├── payloads/            # POST payload'ları (bda içeren)
└── media/               # MP3 dosyaları
```

Toplanan veriler otomatik olarak [arkose-scythe-data](https://github.com/react-RE/arkose-scythe-data) reposuna push edilir.

## Bağımlılıklar

- Node.js 22+
- Chromium veya Chrome

## Kurulum

```bash
git clone https://github.com/react-RE/arkose-scythe.git
cd arkose-scythe
npm install
```

## Kullanım

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

## GitHub Actions

Her saat başı otomatik çalışır. Workflow: `.github/workflows/reap.yml`

## Mimari

| Modül | Görev |
|-------|-------|
| `forge.mjs` | Chrome başlatma, CDP session yönetimi |
| `sniper.mjs` | Network intercept (JS/API/payload capture) |
| `hawk.mjs` | Frame tracker (150ms poll ile iframe takibi) |
| `granary.mjs` | Storage manager |
| `scythe.mjs` | Ana orchestrator |

## Sorumluluk Reddi

Bu araç yalnızca eğitim ve araştırma amaçlıdır. Kullanımından doğacak her türlü sorumluluk kullanıcıya aittir.

## Lisans

AGPL-3.0
