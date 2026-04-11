import { describe, expect, it } from 'vitest';
import {
  buildCorporateEmailLocalCandidates,
  extractYasarStaffLocalPart,
  registrationEmailMatchesStaffNames,
  toAsciiSlug,
  tokenizeNameField,
} from './yasarStaffEmailCandidates';

describe('toAsciiSlug', () => {
  it('transliterates Turkish and keeps ascii', () => {
    expect(toAsciiSlug('Özmehmet')).toBe('ozmehmet');
    expect(toAsciiSlug('Ecehan')).toBe('ecehan');
    expect(toAsciiSlug('Şükrü')).toBe('sukru');
    expect(toAsciiSlug('Çağlar')).toBe('caglar');
  });
});

describe('buildCorporateEmailLocalCandidates', () => {
  it('Ecehan Özmehmet -> ecehan.ozmehmet', () => {
    expect(buildCorporateEmailLocalCandidates('Ecehan', 'Özmehmet')).toEqual(['ecehan.ozmehmet']);
  });

  it('Begüm Sena + Önal Özmalatyalılar -> four combinations', () => {
    const c = buildCorporateEmailLocalCandidates('Begüm Sena', 'Önal Özmalatyalılar').sort();
    expect(c).toEqual(
      ['begum.onal', 'begum.ozmalatyalilar', 'sena.onal', 'sena.ozmalatyalilar'].sort()
    );
  });

  it('ignores empty tokens', () => {
    expect(buildCorporateEmailLocalCandidates('  Ali  ', '  Veli ')).toEqual(['ali.veli']);
  });
});

describe('extractYasarStaffLocalPart', () => {
  it('parses corporate domain', () => {
    expect(extractYasarStaffLocalPart('ecehan.ozmehmet@yasar.edu.tr')).toBe('ecehan.ozmehmet');
  });

  it('rejects student subdomain', () => {
    expect(extractYasarStaffLocalPart('12345@stu.yasar.edu.tr')).toBeNull();
  });
});

describe('registrationEmailMatchesStaffNames', () => {
  it('matches begum.onal against directory names', () => {
    expect(
      registrationEmailMatchesStaffNames('begum.onal@yasar.edu.tr', 'Begüm Sena', 'Önal Özmalatyalılar')
    ).toBe(true);
    expect(
      registrationEmailMatchesStaffNames('sena.onal@yasar.edu.tr', 'Begüm Sena', 'Önal Özmalatyalılar')
    ).toBe(true);
  });

  it('does not match wrong local part', () => {
    expect(
      registrationEmailMatchesStaffNames('other.person@yasar.edu.tr', 'Begüm Sena', 'Önal Özmalatyalılar')
    ).toBe(false);
  });
});

describe('tokenizeNameField', () => {
  it('splits on whitespace', () => {
    expect(tokenizeNameField('Begüm Sena')).toEqual(['Begüm', 'Sena']);
  });
});
