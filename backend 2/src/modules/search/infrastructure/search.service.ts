import { query } from '../../../config/db';
import { extractHashtags } from '../utils/hashtags';

export type SearchType = 'top' | 'users' | 'posts' | 'communities';
export type SearchSort = 'relevance' | 'latest';

export type SearchParams = {
  viewerUserId: number;
  q: string;
  type: SearchType;
  sort: SearchSort;
  limit: number;
  cursor?: string;
};

type ViewerContext = {
  following: number[];
  blocked: number[];
};

function decodeOffset(cursor?: string): number {
  if (!cursor) return 0;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function encodeOffset(n: number): string {
  return Buffer.from(String(n), 'utf8').toString('base64url');
}

async function loadViewerContext(viewerUserId: number): Promise<ViewerContext> {
  const followingRows = await query<{ following_id: number }>(
    'SELECT following_id FROM follows WHERE follower_id = $1',
    [viewerUserId]
  );
  const blockedRows = await query<{ uid: number }>(
    `SELECT blocked_id AS uid FROM blocked_users WHERE blocker_id = $1
     UNION
     SELECT blocker_id AS uid FROM blocked_users WHERE blocked_id = $1`,
    [viewerUserId]
  );
  return {
    following: followingRows.map((r) => r.following_id),
    blocked: blockedRows.map((r) => r.uid),
  };
}

/** Tam metin sorgusu — websearch_to_tsquery özel karakterlerde plainto_tsquery'den daha güvenli. */
function webTsQuerySql(paramRef: string): string {
  return `websearch_to_tsquery('simple', left(btrim(COALESCE(${paramRef}::text, '')), 2000))`;
}

/**
 * v_user_search ile aynı tanım (migration uygulanmamış ortamlarda da arama çalışsın diye inline).
 */
const USER_SEARCH_SUBQUERY = `
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
  ) AS user_tsv,
  COALESCE(
    s.avatar_url,
    st.avatar_url,
    a.avatar_url,
    (SELECT ca.avatar_url FROM public.communities ca WHERE ca.user_id = u.user_id ORDER BY ca.community_id LIMIT 1)
  ) AS avatar_url
FROM public.users u
  LEFT JOIN public.students s ON s.user_id = u.user_id
  LEFT JOIN public.staff st ON st.user_id = u.user_id
  LEFT JOIN public.admins a ON a.user_id = u.user_id
WHERE COALESCE(u.is_active, true) = true
  AND COALESCE(u.has_completed_login, false) = true
`;

/** Arama: gönderi + yazar görünen ad/avatar (feed ile uyumlu COALESCE) */
const POST_SEARCH_SELECT_LIST = `
  p.post_id,
  p.user_id,
  p.content,
  p.created_at::text,
  p.image_url,
  COALESCE(
    s.avatar_url, st.avatar_url, a.avatar_url,
    (SELECT c.avatar_url FROM public.communities c WHERE c.user_id = p.user_id ORDER BY c.community_id LIMIT 1)
  ) AS author_avatar,
  COALESCE(
    NULLIF(TRIM(BOTH ' ' FROM CONCAT(
      TRIM(COALESCE(
        s.student_name, st.staff_name, a.admin_name,
        (SELECT c2.community_name FROM public.communities c2 WHERE c2.user_id = u.user_id ORDER BY c2.community_id LIMIT 1), '')),
      ' ',
      TRIM(COALESCE(s.student_surname, st.staff_surname, a.admin_surname, ''))
    )), ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), '')
  ) AS author_display
`;

const POST_SEARCH_FROM = `
FROM posts p
JOIN users u ON u.user_id = p.user_id
LEFT JOIN public.students s ON s.user_id = p.user_id
LEFT JOIN public.staff st ON st.user_id = p.user_id
LEFT JOIN public.admins a ON a.user_id = p.user_id
`;

export type SearchUserHit = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_private: boolean;
  _score: number;
  highlight?: string;
  avatar_url?: string | null;
};

export type SearchPostHit = {
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  _score: number;
  image_url?: string | null;
  author_avatar?: string | null;
  author_display?: string | null;
};

export type SearchCommunityHit = {
  community_id: number;
  community_name: string;
  description: string;
  category_codes: string[];
  _score: number;
  avatar_url?: string | null;
  cover_url?: string | null;
};

export async function searchAll(params: SearchParams) {
  const ctx = await loadViewerContext(params.viewerUserId);
  const from = decodeOffset(params.cursor);
  const limit = Math.min(Math.max(1, params.limit), 30);
  const q = params.q.trim();
  if (!q) {
    return { error: 'EMPTY_QUERY' as const };
  }

  if (params.type === 'top') {
    const n = Math.min(8, limit);
    const [users, postBundle, communities] = await Promise.all([
      searchUsersPostgres(q, ctx, params.viewerUserId, 0, n, params.sort),
      searchPostsWithHighlightsPostgres(q, ctx, params.viewerUserId, 0, n, params.sort),
      searchCommunitiesPostgres(q, 0, n, params.sort),
    ]);
    return {
      top: { users, posts: postBundle.posts, communities },
      highlights: { posts: postBundle.highlights },
    };
  }

  if (params.type === 'users') {
    const hits = await searchUsersPostgres(
      q,
      ctx,
      params.viewerUserId,
      from,
      limit,
      params.sort
    );
    const nextFrom = from + hits.length;
    return {
      users: hits,
      nextCursor: hits.length === limit ? encodeOffset(nextFrom) : undefined,
    };
  }
  if (params.type === 'posts') {
    const { posts, highlights } = await searchPostsWithHighlightsPostgres(
      q,
      ctx,
      params.viewerUserId,
      from,
      limit,
      params.sort
    );
    const nextFrom = from + posts.length;
    return {
      posts,
      highlights,
      nextCursor: posts.length === limit ? encodeOffset(nextFrom) : undefined,
    };
  }
  if (params.type === 'communities') {
    const hits = await searchCommunitiesPostgres(q, from, limit, params.sort);
    const nextFrom = from + hits.length;
    return {
      communities: hits,
      nextCursor: hits.length === limit ? encodeOffset(nextFrom) : undefined,
    };
  }

  return { error: 'INVALID_TYPE' as const };
}

/** PostgreSQL: ~* için #hashtag sınırları (ASCII + Türkçe harf) */
function hashtagBoundaryRegexForPg(tag: string): string {
  const t = tag.toLowerCase();
  if (!t) return '(?!x)x';
  const esc = t.replace(/[\\.*+?^${}()|[\]]/g, '\\$&');
  return `(^|[^#A-Za-z0-9_ĞüşıöçĞİÜÖÇ])#${esc}($|[^A-Za-z0-9_#ĞüşıöçİĞÜŞÖÇ])`;
}

function userMatchWhere(alias = 'v'): string {
  return `(
    ${alias}.user_tsv @@ ${webTsQuerySql('$1')}
    OR lower(concat_ws(' ', ${alias}.first_name, ${alias}.last_name, ${alias}.display_name, ${alias}.email, ${alias}.email_local, array_to_string(${alias}.interests, ' ')))
       LIKE '%' || lower($1::text) || '%'
  )`;
}

function userPrivacyWhere(alias = 'v'): string {
  return `(
    NOT COALESCE(${alias}.is_private, false)
    OR ${alias}.user_id = $2
    OR (cardinality($3::int[]) > 0 AND ${alias}.user_id = ANY($3::int[]))
  )`;
}

async function searchUsersPostgres(
  qText: string,
  ctx: ViewerContext,
  viewerId: number,
  offset: number,
  size: number,
  _sort: SearchSort
): Promise<SearchUserHit[]> {
  const scoreSql = `GREATEST(
    CASE WHEN v.user_tsv @@ ${webTsQuerySql('$1')}
      THEN ts_rank_cd(v.user_tsv, ${webTsQuerySql('$1')}) + 0.02 ELSE 0 END,
    CASE WHEN lower(concat_ws(' ', v.first_name, v.last_name, v.display_name, v.email, v.email_local, array_to_string(v.interests, ' ')))
      LIKE '%' || lower($1::text) || '%' THEN 0.18 ELSE 0 END
  )`;
  const hlSql = `COALESCE(
    NULLIF(ts_headline(
    'simple',
    trim(both ' ' FROM concat(v.first_name, ' ', v.last_name, ' ', v.display_name)),
    ${webTsQuerySql('$1')},
    'StartSel=<mark>, StopSel=</mark>, MinWords=1, MaxWords=12, ShortWord=0, MaxFragments=1'
    ), ''),
    trim(both ' ' FROM concat(v.first_name, ' ', v.last_name, ' ', v.display_name))
  )`;

  const sql = `
    SELECT
      v.user_id,
      v.first_name,
      v.last_name,
      v.email,
      v.is_private,
      v.avatar_url,
      (${scoreSql})::float8 AS s,
      ${hlSql} AS hl
    FROM (${USER_SEARCH_SUBQUERY}) v
    WHERE
      COALESCE(v.is_banned, false) = false
      AND ${userPrivacyWhere('v')}
      AND (cardinality($4::int[]) = 0 OR NOT (v.user_id = ANY($4::int[])))
      AND ${userMatchWhere('v')}
    ORDER BY s DESC, v.user_id ASC
    OFFSET $5
    LIMIT $6
  `;
  const rows = await query<{
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    is_private: boolean;
    avatar_url: string | null;
    s: number;
    hl: string | null;
  }>(sql, [qText, viewerId, ctx.following, ctx.blocked, offset, size]);
  return rows.map((r) => ({
    user_id: r.user_id,
    first_name: r.first_name || '',
    last_name: r.last_name || '',
    email: r.email || '',
    is_private: Boolean(r.is_private),
    _score: r.s,
    highlight: r.hl && r.hl.trim() ? r.hl : undefined,
    avatar_url: r.avatar_url,
  }));
}

type PostRow = {
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  image_url: string | null;
  author_avatar: string | null;
  author_display: string | null;
  s: number;
  hl: string | null;
};

async function searchPostsWithHighlightsPostgres(
  qText: string,
  ctx: ViewerContext,
  viewerId: number,
  offset: number,
  size: number,
  sort: SearchSort
): Promise<{
  posts: SearchPostHit[];
  highlights: Record<string, string[]>;
}> {
  const tags = extractHashtags(qText);
  const isHashtag = qText.trim().startsWith('#') && tags.length > 0;
  const firstTag = isHashtag ? tags[0]! : null;
  const tagRx = firstTag ? hashtagBoundaryRegexForPg(firstTag) : null;

  const postPrivacy = `(
    NOT COALESCE(u.is_private, false)
    OR p.user_id = $1
    OR (cardinality($2::int[]) > 0 AND p.user_id = ANY($2::int[]))
  )`;
  const blocked = `(cardinality($3::int[]) = 0 OR NOT (p.user_id = ANY($3::int[])))`;
  const ptq = webTsQuerySql('$4');
  const tvec = "to_tsvector('simple', p.content)";

  const textMatch = isHashtag
    ? `(
         p.content ~* $5
         OR (${tvec} @@ ${ptq})
         OR lower(p.content) LIKE '%' || lower($4::text) || '%'
       )`
    : `(
         (${tvec} @@ ${ptq})
         OR lower(p.content) LIKE '%' || lower($4::text) || '%'
       )`;

  const scoreSql = isHashtag
    ? `GREATEST(
        CASE WHEN p.content ~* $5::text THEN 0.35::float8 ELSE 0::float8 END,
        CASE WHEN ${tvec} @@ ${ptq}
          THEN ts_rank_cd(${tvec}, ${ptq}) + 0.02 ELSE 0::float8 END,
        CASE WHEN lower(p.content) LIKE '%' || lower($4::text) || '%' THEN 0.12::float8 ELSE 0::float8 END
      )`
    : `GREATEST(
        CASE WHEN ${tvec} @@ ${ptq}
          THEN ts_rank_cd(${tvec}, ${ptq}) + 0.02 ELSE 0::float8 END,
        CASE WHEN lower(p.content) LIKE '%' || lower($4::text) || '%' THEN 0.12::float8 ELSE 0::float8 END
      )`;

  const orderBy =
    sort === 'latest'
      ? `p.created_at DESC, (${scoreSql})::float8 DESC, p.post_id ASC`
      : `(${scoreSql})::float8 DESC, p.created_at DESC, p.post_id ASC`;

  const hl = `COALESCE(NULLIF(ts_headline(
    'simple',
    p.content,
    ${ptq},
    'StartSel=<mark>, StopSel=</mark>, MaxWords=45, MinWords=1, MaxFragments=1'
  ), ''), p.content)`;

  if (isHashtag && tagRx) {
    const sql = `
      SELECT
        ${POST_SEARCH_SELECT_LIST},
        (${scoreSql})::float8 AS s,
        ${hl} AS hl
      ${POST_SEARCH_FROM}
      WHERE
        COALESCE(u.has_completed_login, false) = true
        AND ${postPrivacy}
        AND ${blocked}
        AND ${textMatch}
      ORDER BY ${orderBy}
      OFFSET $6
      LIMIT $7
    `;
    const rows = await query<PostRow>(sql, [
      viewerId,
      ctx.following,
      ctx.blocked,
      qText,
      tagRx,
      offset,
      size,
    ]);
    return mapPostResults(rows);
  }

  const sql = `
    SELECT
      ${POST_SEARCH_SELECT_LIST},
      (${scoreSql})::float8 AS s,
      ${hl} AS hl
    ${POST_SEARCH_FROM}
    WHERE
      COALESCE(u.has_completed_login, false) = true
      AND ${postPrivacy}
      AND ${blocked}
      AND ${textMatch}
    ORDER BY ${orderBy}
    OFFSET $5
    LIMIT $6
  `;
  const rows = await query<PostRow>(sql, [
    viewerId,
    ctx.following,
    ctx.blocked,
    qText,
    offset,
    size,
  ]);
  return mapPostResults(rows);
}

function mapPostResults(rows: PostRow[]): { posts: SearchPostHit[]; highlights: Record<string, string[]> } {
  const posts: SearchPostHit[] = [];
  const highlights: Record<string, string[]> = {};
  for (const r of rows) {
    posts.push({
      post_id: r.post_id,
      user_id: r.user_id,
      content: r.content || '',
      created_at: r.created_at || '',
      _score: r.s,
      image_url: r.image_url,
      author_avatar: r.author_avatar,
      author_display: r.author_display,
    });
    if (r.hl) highlights[String(r.post_id)] = [r.hl];
  }
  return { posts, highlights };
}

async function searchCommunitiesPostgres(
  qText: string,
  offset: number,
  size: number,
  sort: SearchSort
): Promise<SearchCommunityHit[]> {
  const tsv = `to_tsvector('simple', coalesce(c.community_name, '') || ' ' || coalesce(c.description, '') || ' ' || coalesce(array_to_string(c.category_codes, ' '), ''))`;
  const score = `GREATEST(
    CASE WHEN ${tsv} @@ ${webTsQuerySql('$1')}
      THEN ts_rank_cd(${tsv}, ${webTsQuerySql('$1')}) + 0.02 ELSE 0 END,
    CASE WHEN lower(coalesce(c.community_name, '')) LIKE '%' || lower($1::text) || '%' THEN 0.15::float8 ELSE 0::float8 END,
    CASE WHEN lower(coalesce(c.description, '')) LIKE '%' || lower($1::text) || '%' THEN 0.1::float8 ELSE 0::float8 END
  )`;
  const order =
    sort === 'latest' ? 'c.community_id DESC' : `(${score})::float8 DESC, c.community_id DESC`;

  const where = `(
    (${tsv} @@ ${webTsQuerySql('$1')})
    OR lower(c.community_name || ' ' || coalesce(c.description, '') || ' ' || coalesce(array_to_string(c.category_codes, ' '), ''))
        LIKE '%' || lower($1::text) || '%'
  )`;

  const sql = `
    SELECT
      c.community_id,
      c.community_name,
      coalesce(c.description, '')::text AS description,
      coalesce(c.category_codes, '{}'::text[])::text[] AS category_codes,
      c.avatar_url,
      c.cover_url,
      (${score})::float8 AS s
    FROM public.communities c
    WHERE ${where}
    ORDER BY ${order}
    OFFSET $2
    LIMIT $3
  `;
  const rows = await query<{
    community_id: number;
    community_name: string;
    description: string;
    category_codes: string[];
    avatar_url: string | null;
    cover_url: string | null;
    s: number;
  }>(sql, [qText, offset, size]);
  return rows.map((r) => ({
    community_id: r.community_id,
    community_name: r.community_name || '',
    description: r.description || '',
    category_codes: r.category_codes || [],
    _score: r.s,
    avatar_url: r.avatar_url,
    cover_url: r.cover_url,
  }));
}
