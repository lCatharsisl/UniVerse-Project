import { describe, it, expect } from 'vitest';
import { extractHashtags } from './hashtags';

describe('extractHashtags', () => {
  it('parses simple tags and lowercases', () => {
    expect(extractHashtags('Hello #Foo #bar')).toEqual(['foo', 'bar']);
  });
  it('ignores empty', () => {
    expect(extractHashtags('no tags')).toEqual([]);
  });
  it('supports unicode letters', () => {
    const tags = extractHashtags('#campüs #yasar');
    expect(tags.length).toBe(2);
    expect(tags.every((t) => t.length > 0)).toBe(true);
  });
});
