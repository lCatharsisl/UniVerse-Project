# UniVerse Backend API

Node.js + Express + TypeScript + PostgreSQL REST API backend for UniVerse application.

## Kurulum

```bash
# Dependencies yükle
npm install

# Environment variables ayarla
cp .env.example .env
# .env dosyasını düzenle ve PostgreSQL bağlantı bilgilerini gir

# Veritabanı migration'larını çalıştır
# PostgreSQL'e bağlan ve migration dosyalarını sırayla çalıştır:
# 1. migrations/001_schema_update.sql
# 2. migrations/002_create_offices_table.sql
```

## Çalıştırma

```bash
# Development mode (hot reload)
npm run dev

# Production build
npm run build
npm start
```

## Swagger API Dokümantasyonu

Server çalıştıktan sonra Swagger UI'ya şu adresten erişebilirsin:

**http://localhost:3000/api-docs**

Swagger UI'da:
- Tüm endpoint'leri görebilirsin
- Request/Response şemalarını inceleyebilirsin
- "Try it out" butonu ile direkt API'leri test edebilirsin
- Authentication için Bearer token ekleyebilirsin

### Authentication Test Etme

1. `/auth/login` endpoint'ini kullanarak bir session token al
2. Swagger UI'da sağ üstteki "Authorize" butonuna tıkla
3. Token'ı `Bearer <token>` formatında gir (sadece token'ı gir, "Bearer" kelimesi otomatik eklenir)
4. Artık tüm protected endpoint'leri test edebilirsin

## API Endpoints

### Authentication

- `POST /auth/register` - Kullanıcı kaydı
- `POST /auth/login` - Giriş yap
- `POST /auth/logout` - Çıkış yap (Bearer token gerekli)
- `POST /auth/verify-email` - Email doğrulama
- `GET /auth/me` - Mevcut kullanıcı bilgisi (Bearer token gerekli)

### Rooms (Oda ve Program)

- `GET /rooms/free?day=1&time=09:00:00&buildingName=ENG&floorNumber=2` - Boş odaları listele
- `GET /rooms/:roomCode/at?day=1&time=09:00:00` - Belirli bir odada belirli zamandaki ders
- `GET /rooms/:roomId/schedule?day=1` - Oda programı (günlük veya haftalık)

### Lost & Found Items

- `POST /lost-items` - Kayıp eşya ekle (Bearer token gerekli)
- `GET /lost-items?location=...&isResolved=false&limit=50&offset=0` - Kayıp eşyaları listele (Bearer token gerekli)
- `PATCH /lost-items/:id/resolve` - Kayıp eşyayı çözüldü olarak işaretle (Bearer token gerekli)

- `POST /found-items` - Buluntu eşya ekle (Bearer token gerekli)
- `GET /found-items?location=...&isResolved=false&limit=50&offset=0` - Buluntu eşyaları listele (Bearer token gerekli)
- `PATCH /found-items/:id/resolve` - Buluntu eşyayı çözüldü olarak işaretle (Bearer token gerekli)

## Örnek İstekler

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123",
    "role": "student",
    "studentNumber": "2024001",
    "studentName": "Ahmet",
    "studentSurname": "Yılmaz",
    "departmentId": 1
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'
```

### Get Free Rooms

```bash
curl -X GET "http://localhost:3000/rooms/free?day=1&time=09:00:00" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### Create Lost Item

```bash
curl -X POST http://localhost:3000/lost-items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "lostItemName": "Siyah Cüzdan",
    "location": "Kütüphane",
    "description": "İçinde kimlik kartı var",
    "lostDate": "2024-01-15T10:00:00Z"
  }'
```

## Güvenlik

- Tüm hassas endpointler Bearer token authentication gerektirir
- Passwords bcrypt ile hash'lenir
- Session token'lar 7 gün geçerlidir
- Email verification token'lar 24 saat geçerlidir
- Zod ile tüm input validasyonu yapılır

## Proje Yapısı

```
backend/
├── src/
│   ├── config/          # Database ve environment config
│   ├── controllers/     # Request/response handlers
│   ├── middleware/      # Auth, validation, error handling
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic ve database operations
│   ├── validators/      # Zod validation schemas
│   └── server.ts        # Express app bootstrap
├── migrations/          # Database migration files
├── package.json
├── tsconfig.json
└── README.md
```

## Veritabanı

PostgreSQL kullanılır. Migration dosyaları `migrations/` klasöründe bulunur.

## Notlar

- Development modunda TypeScript dosyaları doğrudan `tsx` ile çalıştırılır
- Production'da önce `npm run build` ile compile edilir, sonra `npm start` ile çalıştırılır
- Environment variables `.env` dosyasından okunur (`.env.example` dosyasına bakın)
- Swagger dokümantasyonu `/api-docs` endpoint'inde mevcuttur
- Tüm API testlerini Swagger UI üzerinden yapabilirsin

