-- Dizin/içe aktarma ile oluşturulmuş fakat uygulamada hiç giriş yapmamış hesaplar
-- arama ve sohbet önerilerinde listelenmesin. İlk başarılı oturumda has_completed_login = true.
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS has_completed_login boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.has_completed_login IS
  'En az bir kez başarılı uygulama girişi (user_sessions) yapıldı; dizin-only kayıtlar false kalır.';

-- Halihazırda aktif veya geçmiş oturumu olanlar (mümkün olanlar) işaretlensin
UPDATE public.users u
SET has_completed_login = true
WHERE EXISTS (SELECT 1 FROM public.user_sessions us WHERE us.user_id = u.user_id);

-- v_user_search: aramayla aynı görünürlük kuralı
CREATE OR REPLACE VIEW public.v_user_search AS
SELECT
  u.user_id,
  u.email,
  split_part(COALESCE(u.email, ''), '@', 1) AS email_local,
  TRIM(
    COALESCE(
      s.student_name,
      st.staff_name,
      a.admin_name,
      (SELECT c.community_name FROM public.communities c WHERE c.user_id = u.user_id ORDER BY c.community_id LIMIT 1),
      ''
    )
  )::text AS first_name,
  TRIM(COALESCE(s.student_surname, st.staff_surname, a.admin_surname, ''))::text AS last_name,
  COALESCE(
    NULLIF(
      TRIM(
        BOTH
        FROM
          concat(
            TRIM(
              COALESCE(
                s.student_name,
                st.staff_name,
                a.admin_name,
                (SELECT c.community_name FROM public.communities c WHERE c.user_id = u.user_id ORDER BY c.community_id LIMIT 1),
                ''
              )
            ),
            ' ',
            TRIM(COALESCE(s.student_surname, st.staff_surname, a.admin_surname, ''))
          )
      ),
      ''
    ),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), '')
  )::text AS display_name,
  u.role,
  COALESCE(s.interests, st.interests, '{}'::text[]) AS interests,
  COALESCE(u.is_active, true) AS is_active,
  COALESCE(u.is_private, false) AS is_private,
  COALESCE(u.is_banned, false) AS is_banned,
  to_tsvector(
    'simple',
    concat_ws(
      ' ',
      TRIM(
        COALESCE(
          s.student_name,
          st.staff_name,
          a.admin_name,
          (SELECT c.community_name FROM public.communities c WHERE c.user_id = u.user_id ORDER BY c.community_id LIMIT 1),
          ''
        )
      ),
      TRIM(COALESCE(s.student_surname, st.staff_surname, a.admin_surname, '')),
      COALESCE(
        NULLIF(
          TRIM(
            BOTH
            FROM
              concat(
                TRIM(
                  COALESCE(
                    s.student_name,
                    st.staff_name,
                    a.admin_name,
                    (SELECT c2.community_name FROM public.communities c2 WHERE c2.user_id = u.user_id ORDER BY c2.community_id LIMIT 1),
                    ''
                  )
                ),
                ' ',
                TRIM(COALESCE(s.student_surname, st.staff_surname, a.admin_surname, ''))
              )
          ),
          ''
        ),
        split_part(COALESCE(u.email, ''), '@', 1)
      ),
      split_part(COALESCE(u.email, ''), '@', 1),
      u.email,
      array_to_string(COALESCE(s.interests, st.interests, '{}'::text[]), ' ')
    )
  ) AS user_tsv
FROM public.users u
  LEFT JOIN public.students s ON s.user_id = u.user_id
  LEFT JOIN public.staff st ON st.user_id = u.user_id
  LEFT JOIN public.admins a ON a.user_id = u.user_id
WHERE COALESCE(u.is_active, true) = true
  AND COALESCE(u.has_completed_login, false) = true;

COMMENT ON VIEW public.v_user_search IS 'Aranabilir kullanıcı alanları; yalnızca en az bir kez giriş yapmış (has_completed_login) kayıtlar.';

COMMIT;
