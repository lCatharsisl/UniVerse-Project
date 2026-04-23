-- Arama: Elasticsearch yerine PostgreSQL (indeks + isteğe bağlı v_user_search görünümü)
-- Not: uygulama araması artık pg_trgm / word_similarity gerektirmez; yalnızca tsvector + ILIKE.
BEGIN;

-- (İsteğe bağlı) GIN tsvector indeksleri: bazı barındırıcılarda ifade IMMUTABLE değil hatası verir;
-- ihtiyaçta Dashboard SQL ile generated column + indeks ayrı eklenebilir.

-- v_user_search: performans/raporlama için isteğe bağlı; backend araması aynı SQL’i inline da çalıştırır
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
WHERE COALESCE(u.is_active, true) = true;

COMMENT ON VIEW public.v_user_search IS 'Aranabilir kullanıcı alanları; ES kaldırıldı, search.service doğrudan bu görünümden sorgular.';

COMMIT;
