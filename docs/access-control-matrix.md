# 🔐 Erişim Kontrol Matrisi (RBAC/ABAC)

Bu doküman, UniVerse backend endpoint'lerinde rol bazlı (RBAC) ve bağlam bazlı (ABAC) erişim beklentilerini özetler.

---

## 📋 Roller

- `student`
- `staff`
- `admin`
- `community`

---

## 🎯 Kural Prensipleri

- Kimlik doğrulama gereken endpointlerde `authenticateSession` zorunludur.
- RBAC: Rol bazlı erişim (`student/staff/admin/community`).
- ABAC: İstek yapan kullanıcı, kaynak sahibi mi / topluluk üyesi mi / engelli mi gibi koşullar.
- Yasaklı (`isBanned=true`) hesaplar sosyal özelliklerde kısıtlanır.

---

## ✅ Sosyal Modül (Özet)

| Endpoint | Student | Staff/Admin | Community | Notlar |
| --- | --- | --- | --- | --- |
| `GET /api/social/health` | ✅ | ✅ | ✅ | Auth gerekmez |
| `GET /api/social/feed` | ✅ | ✅ | ✅ | Auth gerekir |
| `POST /api/social/posts/:id/report` | ✅ | ✅ | ✅ | Auth gerekir, banned kontrolü |
| `GET /api/social/reported/posts` | ❌ | ✅ | ❌ | Academic only |

---

## ✅ Community Modül (Özet)

| Endpoint | Student | Staff/Admin | Community | Notlar |
| --- | --- | --- | --- | --- |
| `GET /api/community/fair` | ✅ | ✅ | ✅ | Auth gerekir |
| `GET /api/community/me` | ✅ | ✅ | ✅ | Auth gerekir, session user id valid olmalı |
| `PATCH /api/community/:communityId/categories` | ❌ | ❌ | ✅(owner) | Topluluk sahibi kontrolü |
| `PATCH /api/community/:communityId/media` | ❌ | ❌ | ✅(owner) | Topluluk sahibi + upload kontrolü |

---

## ✅ Messaging Modül (Özet)

| Endpoint | Student | Staff/Admin | Community | Notlar |
| --- | --- | --- | --- | --- |
| `GET /api/messages/users/search` | ✅ | ✅ | ✅ | Auth gerekir, `q` zorunlu |
| `POST /api/messages/conversations` | ✅ | ✅ | ✅ | Auth gerekir, `participantIds` array olmalı |
| `GET /api/messages/conversations` | ✅ | ✅ | ✅ | Katılımcı bazlı erişim |
| `POST /api/messages/conversations/:id/messages` | ✅ | ✅ | ✅ | Katılımcı + bloklama kuralları |

---

## 🧪 Doğrulama (Test Kanıtı)

Mevcut test seti aşağıdaki erişim davranışlarını doğrular:

- Auth olmayan isteklerin `401` dönmesi
- Role/permission uyumsuzluklarında `403` dönmesi
- Zorunlu parametre/body eksiklerinde `400` dönmesi
- Uygun rol/bağlamda başarılı akış (`200/201`)

---

## 📝 Sonraki İyileştirme Adımları

1. Endpoint-level policy map'i koddan otomatik üretmek
2. ABAC kurallarını merkezi policy katmanına taşımak
3. RBAC/ABAC testlerini tablo bazlı (matrix-driven) hale getirmek

---

**Durum:** Aktif kullanımda  
**Son güncelleme:** 2026-04-24
