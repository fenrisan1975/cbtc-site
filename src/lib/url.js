// Only ever treat http(s) URLs as safe to render as a clickable link --
// guards against a stored javascript:/data: URL turning into a link,
// even if something slipped past intake validation (e.g. old data, or a
// future code path that skips the check in submit-business.js).
export function isSafeUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}
