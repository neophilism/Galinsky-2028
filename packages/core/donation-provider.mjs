// Hosted-only fundraising: this site never accepts card or donor data itself.
export function validateAnedotHostedUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('ANEDOT_DONATION_URL must be configured before fundraising can open.');
  let url;
  try { url = new URL(raw.trim()); } catch { throw new Error('Invalid Anedot donation URL.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'secure.anedot.com' ||
      url.port || url.username || url.password || url.hash || url.search ||
      url.pathname.split('/').filter(Boolean).length < 2) {
    throw new Error('ANEDOT_DONATION_URL must be a clean, verified https://secure.anedot.com/{account}/{page} URL.');
  }
  return url.href;
}
export function approvedHostedDonationUrl(env, releaseMode) {
  if (releaseMode !== 'production' || env.DONATIONS_ENABLED !== 'true' ||
      env.DONATIONS_TREASURER_APPROVED !== 'true') return null;
  return validateAnedotHostedUrl(env.ANEDOT_DONATION_URL);
}
