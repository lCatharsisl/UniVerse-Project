/** Extract hashtag tokens (no #) from post content — Unicode letters, digits, underscore. */
export function extractHashtags(content: string | null | undefined): string[] {
  if (!content) return [];
  const re = /#([\p{L}0-9_]+)/gu;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  for (;;) {
    m = re.exec(content);
    if (!m) break;
    const t = m[1].toLowerCase();
    if (t) set.add(t);
  }
  return [...set];
}
