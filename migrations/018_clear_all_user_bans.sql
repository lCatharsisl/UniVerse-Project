-- Tüm kullanıcılarda ban kaldırılır (tekil unban API ile aynı: is_banned + warning_tier sıfırlanır)
UPDATE users
SET
  is_banned = false,
  warning_tier = 0
WHERE COALESCE(is_banned, false) = true;
