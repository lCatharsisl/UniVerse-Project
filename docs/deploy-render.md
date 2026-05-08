# UniVerse’i Render’a almak

Bu proje iki parçalı production kurulumunu destekler: **REST API** (Node) ve **Vite ile üretilmiş statik frontend**. Veritabanı ve **tüm medya dosyaları** için **Supabase** (Postgres + Storage) **zorunludur**.

## Özet sıra

1. Supabase’te proje açın: **Database** (`DATABASE_URL`), **Storage** için **Project URL** + **service_role** + kamuya açık/policy’li **bucket** (ör. `uploads`).
2. Render’da **Blueprint** ile bu repodaki `render.yaml` yükleyin veya iki **Web Service** elle oluşturun.
3. Önce **API** servisini deploy edin; canlı URL’yi not edin (örn. `https://universe-api.onrender.com`).
4. **Statik site** için build sırasında `VITE_API_BASE_URL` olarak bu adresi ayarlayın (`/api` eki kod tarafından otomatik tamamlanır).
5. API ortamında `FRONTEND_URL` ve gerekiyorsa `CORS_ORIGINS` ile statik sitenizin tam kökünü verin (`https://universe-web.onrender.com` vb.).
6. `BACKEND_PUBLIC_URL`’i API’nin kamuya açık URL’si yapın (Swagger taban adresi için).

## Backend ortam değişkenleri (zorunlu / tipik)

| Değişken | Açıklama |
|---------|----------|
| `DATABASE_URL` | Supabase Postgres URI (TLS). |
| `SESSION_SECRET` | En az 32 karakter (Render Blueprint’te `generateValue` kullanılabilir). |
| `FRONTEND_URL` | Statik uygulama kök URL’si — CORS allow list için. |
| `CORS_ORIGINS` | Birden fazla origin gerekiyorsa virgülle; genelde frontend URL’nizi dahil edin. |
| `BACKEND_PUBLIC_URL` | Örn. `https://universe-api.onrender.com` |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Supabase projesi → Settings → API URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage’e yazım (yalnızca sunucuda). |
| `SUPABASE_STORAGE_BUCKET` | Örn. `uploads` — bucket adı env ile aynı olmalı. |

Render, çalışan serviste `RENDER=true` tanımlar; backend `trust proxy` bununla etkinleşir (X-Forwarded-For / şema). Docker veya başka bir reverse proxy için `TRUST_PROXY=1` de kullanılabilir.

## Frontend build (`VITE_*`)

| Değişken | Açıklama |
|---------|----------|
| `VITE_API_BASE_URL` | API sunucusunun kökü, örn. `https://universe-api.onrender.com`. `/api` yoksa kod ekler. |
| `VITE_UPLOADS_BASE_URL` | İsteğe bağlı. API yanıtında zaten tam `https://…supabase…` URL döner; genelde boş bırakılabilir. |

Yerel geliştirmede bu değişkenleri tanımlamayın; Vite `/api` proxy’si ile API’ye bağlanın. Medya olarak yalnızca Supabase CDN URL’leri kullanılır.

## Docker Compose ile fark

`docker-compose` içindeki frontend imajı nginx ile `/api`’yi backend’e yönlendirir; görseller doğrudan Supabase public URL’leri üzerinden gelir (yerel `/uploads/` artık kullanılmaz). `VITE_API_BASE_URL`çoğu yerel senaryoda opsiyoneldir.

Render’da iki ayrı servis kullanıldığında statik site build’i için **mutlaka** `VITE_API_BASE_URL` verin.

## Sağlık kontrolleri

API kökünde `GET /health` liveness için uygundur; `render.yaml` içinde `healthCheckPath: /health` tanımlıdır.

## Ücretsiz katman notları

Render Free web servisleri uyku moduna girer; ilk istekte gecikme olabilir. Medya dosyaları **yalnızca Supabase Storage**’da saklanır (API sunucusunda kalıcı yerel `uploads/` kullanılmaz).
