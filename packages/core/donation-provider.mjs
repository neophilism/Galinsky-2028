// Each donation route leads directly to a separately underwritten provider's public hosted checkout.
// Card numbers and donor identity details must never be collected or relayed by this application.
import {isIP} from 'node:net';

export const MAX_DONATION_PROCESSORS = 4;
export const MIN_DONATION_PROCESSORS = 3;

function invalid(message) { return new Error('Donation provider configuration: ' + message); }
function approvedHost(value) {
  if (typeof value !== 'string') throw invalid('an exact approved checkout hostname is required');
  const host = value.trim().toLowerCase();
  if (host.length > 253 || !host.includes('.') || !/^[a-z0-9.-]+$/.test(host) ||
      host.split('.').some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) ||
      host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      isIP(host) || /(^|\.)(stripe\.com|stripe\.network|stripepayments\.com|stripe-cdn\.com)$/.test(host)) {
    throw invalid('invalid, local or prohibited processor hostname');
  }
  return host;
}

export function validateHostedDonationUrl(raw, exactHostname) {
  const host = approvedHost(exactHostname);
  if (typeof raw !== 'string' || raw.length > 2048 || !raw.trim()) {
    throw invalid('a public hosted checkout URL is required');
  }
  let url;
  try { url = new URL(raw.trim()); } catch { throw invalid('invalid hosted checkout URL'); }
  if (url.protocol !== 'https:' || url.hostname !== host || url.port ||
      url.username || url.password || url.hash || url.href.length > 2048) {
    throw invalid('checkout URL must use HTTPS and match the exact approved processor hostname');
  }
  return url.href;
}

// Configuration is intentionally explicit. A public link is never evidence of a working
// account, equal commercial treatment, bank approval, donor compliance, or usable settlements.
export function approvedDonationRoutes(env, releaseMode) {
  if (releaseMode !== 'production' || env.DONATIONS_ENABLED !== 'true' ||
      env.DONATIONS_TREASURER_APPROVED !== 'true') return [];
  const routes = [];
  const ids = new Set();
  const hosts = new Set();
  for (let slot = 1; slot <= MAX_DONATION_PROCESSORS; slot++) {
    const prefix = 'DONATIONS_PROCESSOR_' + slot + '_';
    if (env[prefix + 'APPROVED'] !== 'true') continue;
    const id = env[prefix + 'ID'];
    const name = env[prefix + 'NAME'];
    if (typeof id !== 'string' || !/^[a-z][a-z0-9-]{1,39}$/.test(id) ||
        typeof name !== 'string' || name.trim().length < 2 || name.length > 80 ||
        /stripe/i.test(id + ' ' + name)) {
      throw invalid('an approved processor needs a safe unique ID and display name');
    }
    const host = approvedHost(env[prefix + 'HOST']);
    const url = validateHostedDonationUrl(env[prefix + 'URL'], host);
    if (ids.has(id) || hosts.has(host)) {
      throw invalid('processor IDs and checkout hostnames must be distinct');
    }
    ids.add(id);
    hosts.add(host);
    routes.push({id, name: name.trim(), url});
  }
  if (routes.length < MIN_DONATION_PROCESSORS) {
    throw invalid('at least three independently approved providers must be configured before opening online donations');
  }
  const preferred = env.DONATIONS_PRIMARY_PROCESSOR_ID;
  if (preferred && !ids.has(preferred)) throw invalid('primary processor is not among approved active routes');
  if (preferred) routes.sort((a, b) => (a.id === preferred ? -1 : b.id === preferred ? 1 : 0));
  return routes;
}
