# 🚀 UniVerse Project Setup Guide

Bu proje **UniVerse Campus Ecosystem**'in kaynak kodlarını içerir. Projeyi GitHub'dan çektikten sonra aşağıdaki adımları takip ederek sistemi çalıştırabilirsiniz.

## 📋 Gereksinimler

- Node.js (v18 veya üzeri)
- npm veya yarn

## 🛠 Kurulum Adımları

### 1. Dosyaları Çekin ve Bağımlılıkları Kurun

Terminalinizi açın ve ana dizinde (root) şu komutu çalıştırarak tüm (frontend, backend, root) bağımlılıkları tek seferde kurun:

```bash
npm run install:all
```

_(Alternatif olarak her klasöre girip tek tek `npm install` yapabilirsiniz.)_

### 2. Çevre Değişkenlerini (.env) Ayarlayın

`.env` dosyaları repoda yoktur; kendi Supabase / oturum değerlerinizi **yerelde** tanımlayın.

1. [`backend/.env.example`](backend/.env.example) dosyasını `backend/.env` olarak kopyalayın.
2. Supabase projenizden `DATABASE_URL` (veya `DB_*` alanları) ve en az 32 karakterlik `SESSION_SECRET` değerlerini doldurun.

Kök dizinde **`npm run sync:frontend-env`** çalıştırarak `frontend/.env` içine `backend/.env`’deki `BACKEND_PUBLIC_URL` (yoksa `http://localhost:${PORT}`) üzerinden `VITE_API_BASE_URL` yazılır; veritabanı anahtarı gibi sırlar taşınmaz.

Ayrıntılı alan listesi için `backend/.env.example` içindeki yorumlara bakın. Production’da statik frontend ayrı host’taysa `frontend/.env.example` içindeki `VITE_API_BASE_URL` notlarına bakın; Render adımları için [docs/deploy-render.md](docs/deploy-render.md).

### 3. Sistemi Çalıştırın

Ana dizindeyken (root) şu komutu kullanarak hem Frontend'i hem de Backend'i aynı anda başlatabilirsiniz:

```bash
npm run dev
```

**Aynı Wi‑Fi / yerel ağdan başka bilgisayar:** Önce `backend/.env` içinde konsolun yazdığı gibi `CORS_ORIGINS=...` (localhost + senin LAN IP adresin `:5173`) tanımlayın, sonra ana dizinden:

```bash
npm run dev:lan
```

Arkadaş tarayıcıda `http://SENİN_IP:5173` adresini açar; API çağrıları senin makinedeki Vite proxy üzerinden gider (arkadaşın PC’sinde `:3000` açması gerekmez). macOS Güvenlik Duvarı uyarı çıkarırsa Node’a gelen bağlantılara izin verin.

Bu başlatıcı macOS üzerinde `node_modules` içindeki indirilen native binary'ler Gatekeeper quarantine yüzünden bloklanmışsa açılış öncesi ilgili quarantine attribute'unu temizlemeyi dener. Proje dosyaları AirDrop, WhatsApp, Drive zip'i gibi kaynaklardan geldiyse bu özellikle önemlidir.

### 4. CI Kontrollerini Localde Doğrulayın

 GitHub Actions üzerinde çalışan temel CI hattı, backend için `build + test + integration test`, frontend için `smoke test + build` kontrollerini koşturur. Push atmadan önce aynı kontrolleri localde ana dizinden şu komutla çalıştırabilirsiniz:

```bash
npm run ci
```

Not: Bu komutun sağlıklı çalışması için önce `backend` ve `frontend` bağımlılıklarının kurulmuş olması gerekir. İlk kurulum için `npm run install:all` yeterlidir.

## Environment Profiles (Dev / Staging / Prod)

Proje şu an tek kod tabanı ile ortam bazlı env değişkenleri üzerinden çalışır. Mevcut akış değişmeden aşağıdaki ayrımı kullanabilirsiniz:

- `development`: lokal geliştirme (`FRONTEND_URL=http://localhost:5173`, `BACKEND_PUBLIC_URL=http://localhost:3000`)
- `staging`: test/değerlendirme ortamı (staging domain URL'leri, staging DB)
- `production`: canlı ortam (prod domain URL'leri, prod DB)

Ortak kontrol listesi:

- `SESSION_SECRET` en az 32 karakter
- `DATABASE_URL` (veya `DB_*`) aktif ortama doğru bakıyor
- `FRONTEND_URL` ve `BACKEND_PUBLIC_URL` aynı ortamı işaret ediyor
- Microsoft login kullanılacaksa `MICROSOFT_REDIRECT_URI` ortam URL'si ile eşleşiyor
- Monitoring kullanılacaksa `MONITORING_ENABLED=true` ve `MONITORING_WEBHOOK_URL` birlikte tanımlı

## Microsoft Login Setup

Yaşar Üniversitesi Microsoft hesabı ile giriş için backend tarafında aşağıdaki environment variable'lar tanımlanmalıdır:

```env
FRONTEND_URL=http://localhost:5173
BACKEND_PUBLIC_URL=http://localhost:3000
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=...
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
```

Microsoft Entra ID tarafında app registration açılırken callback olarak `MICROSOFT_REDIRECT_URI` değeri tanımlanmalıdır.

## Staging Deploy (Manual)

Staging deploy workflow'u (`.github/workflows/staging-deploy.yml`) varsayılan olarak sadece simulation çalıştırır. Canlı staging deploy için manuel tetiklemede:

- `run_live_deploy=true`
- `confirm_live_deploy=DEPLOY_STAGING`

alanları birlikte verilmelidir.

Canlı staging deploy öncesi GitHub `staging` environment secret'ları:

- `STAGING_SSH_HOST`
- `STAGING_SSH_PORT` (opsiyonel, default `22`)
- `STAGING_SSH_USER`
- `STAGING_SSH_KEY`
- `STAGING_SSH_KNOWN_HOSTS` (opsiyonel, verilmezse `ssh-keyscan` kullanılır)
- `STAGING_DEPLOY_PATH`
- `STAGING_DEPLOY_COMMAND`

---

## 🛰 Teknolojiler

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL)

## 🌌 Temalar

Sistemde **Ground Mode** (Aydınlık) ve **Space Mode** (Karanlık) bulunmaktadır. Giriş ekranındaki "Ignite Engines" butonu ile modlar arası geçiş yapabilirsiniz.
