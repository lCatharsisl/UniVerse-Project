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

Ayrıntılı alan listesi için `backend/.env.example` içindeki yorumlara bakın.

### 3. Sistemi Çalıştırın

Ana dizindeyken (root) şu komutu kullanarak hem Frontend'i hem de Backend'i aynı anda başlatabilirsiniz:

```bash
npm run dev
```

### 4. CI Kontrollerini Localde Doğrulayın

 GitHub Actions üzerinde çalışan temel CI hattı, backend için `build + test`, frontend için `lint + build` kontrollerini koşturur. Push atmadan önce aynı kontrolleri localde ana dizinden şu komutla çalıştırabilirsiniz:

```bash
npm run ci
```

Not: Bu komutun sağlıklı çalışması için önce `backend` ve `frontend` bağımlılıklarının kurulmuş olması gerekir. İlk kurulum için `npm run install:all` yeterlidir.

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

---

## 🛰 Teknolojiler

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL)

## 🌌 Temalar

Sistemde **Ground Mode** (Aydınlık) ve **Space Mode** (Karanlık) bulunmaktadır. Giriş ekranındaki "Ignite Engines" butonu ile modlar arası geçiş yapabilirsiniz.
