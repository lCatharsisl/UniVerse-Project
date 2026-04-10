/** Yaşar kurumsal personel e-postası: aday local-part üretimi (isim.soyisim, çoklu ad/soyad kartezyeni). */

export const YASAR_STAFF_EMAIL_DOMAIN = '@yasar.edu.tr';

const TR_LOWER_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  i: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
};

/**
 * Tek bir ad veya soyad parçasını ASCII slug yapar (yalnızca a-z0-9).
 * Türkçe locale ile küçük harf, sonra harf dönüşümü.
 */
export function toAsciiSlug(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLocaleLowerCase('tr-TR');
  let out = '';
  for (const ch of lower) {
    const mapped = TR_LOWER_MAP[ch] ?? ch;
    if (/^[a-z0-9]$/i.test(mapped)) {
      out += mapped.toLowerCase();
    }
  }
  return out;
}

/** Boşluklara göre anlamlı parçalar (çoklu ad / çift soyad). */
export function tokenizeNameField(field: string): string[] {
  return field
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Veritabanındaki staff_name + staff_surname için olası local-part listesi
 * (ör. begum.onal, sena.onal, begum.ozmalatyalilar, sena.ozmalatyalilar).
 */
export function buildCorporateEmailLocalCandidates(firstNameField: string, lastNameField: string): string[] {
  const firstTokens = tokenizeNameField(firstNameField);
  const lastTokens = tokenizeNameField(lastNameField);
  const set = new Set<string>();
  for (const f of firstTokens) {
    const sf = toAsciiSlug(f);
    if (!sf) continue;
    for (const l of lastTokens) {
      const sl = toAsciiSlug(l);
      if (!sl) continue;
      set.add(`${sf}.${sl}`);
    }
  }
  return Array.from(set);
}

export function normalizeStaffRegistrationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function extractYasarStaffLocalPart(email: string): string | null {
  const e = normalizeStaffRegistrationEmail(email);
  if (e.endsWith('@stu.yasar.edu.tr')) return null;
  if (!e.endsWith('@yasar.edu.tr')) return null;
  const local = e.slice(0, -YASAR_STAFF_EMAIL_DOMAIN.length);
  return local.length > 0 ? local : null;
}

/** Kayıt e-postasının local kısmı, staff ad/soyadından üretilen adaylardan biriyle eşleşiyor mu? */
export function registrationEmailMatchesStaffNames(
  registrationEmail: string,
  staffFirstNameField: string,
  staffLastNameField: string
): boolean {
  const local = extractYasarStaffLocalPart(registrationEmail);
  if (!local) return false;
  const candidates = buildCorporateEmailLocalCandidates(staffFirstNameField, staffLastNameField);
  return candidates.includes(local);
}
