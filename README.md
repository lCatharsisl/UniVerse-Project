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

Proje güvenliği için `.env` dosyaları paylaşılmamıştır. **backend** klasörü içerisinde `.env` adında bir dosya oluşturun ve ortak Supabase bilgilerimizi buraya girin:

```env
PORT=3000
DB_USER=postgres
DB_HOST=[SUPABASE_HOST_ADRESI]
DB_NAME=postgres
DB_PASSWORD=[ORTAK_SIFRE]
DB_PORT=5432
```

### 3. Sistemi Çalıştırın

Ana dizindeyken (root) şu komutu kullanarak hem Frontend'i hem de Backend'i aynı anda başlatabilirsiniz:

```bash
npm run dev
```

---

## 🛰 Teknolojiler

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL)

## 🌌 Temalar

Sistemde **Ground Mode** (Aydınlık) ve **Space Mode** (Karanlık) bulunmaktadır. Giriş ekranındaki "Ignite Engines" butonu ile modlar arası geçiş yapabilirsiniz.
