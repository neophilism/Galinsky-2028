// Editorial identities and campaign-specific text/colors are database data.
// This module contains only the shared contract and generic UI field labels.
export const CAMPAIGN_SCHEMA_VERSION = 1;
export const CAMPAIGN_RECORD_PREFIX = 'campaign.document.';
export const CAMPAIGN_PUBLIC_PREFIX = 'campaign.public.';
export const CAMPAIGN_SETTINGS_KEY = 'campaign.selection';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const TEXT_LIMIT = 6000;
export const THEME_TOKENS = Object.freeze([
  'background', 'surface', 'text', 'mutedText', 'primary', 'primaryText',
  'secondary', 'secondaryText', 'link', 'border', 'focus', 'brandRed', 'brandBlue',
]);
const GROUPS = {
  global: { branding: ['slogan', 'footerMotto'] },
  home: {
    hero: ['eyebrow', 'headline', 'body', 'primaryLabel', 'secondaryLabel', 'footnote'],
    promise: ['heading', 'freedomLabel', 'repairLabel', 'opportunityLabel'],
    philosophy: ['eyebrow', 'headline', 'lead', 'body1', 'body2', 'callout'],
    issues: ['eyebrow', 'headline', 'linkLabel', 'footnote'],
    story: ['eyebrow', 'headline', 'body1', 'body2', 'quote', 'linkLabel'],
    join: ['eyebrow', 'headline', 'body', 'buttonLabel'],
    donate: ['eyebrow', 'headline', 'body'],
  },
  issues: {
    intro: ['eyebrow', 'headline', 'body'],
    freedom: ['tagline', 'summary', 'buttonLabel'],
    repair: ['tagline', 'summary', 'buttonLabel'],
    opportunity: ['tagline', 'summary', 'buttonLabel'],
  },
  'issue-freedom': { intro: ['eyebrow', 'headline', 'body'] },
  'issue-repair': { intro: ['eyebrow', 'headline', 'body'] },
  'issue-opportunity': { intro: ['eyebrow', 'headline', 'body'] },
  volunteer: { hero: ['eyebrow', 'headline', 'body', 'primaryLabel', 'secondaryLabel'], join: ['eyebrow', 'headline'] },
  donate: { intro: ['eyebrow', 'headline', 'body'] },
};
for (const page of Object.keys(GROUPS)) {
  if (page !== 'global') GROUPS[page].metadata = ['title', 'description'];
}
export const CAMPAIGN_FIELDS = Object.freeze(Object.entries(GROUPS).flatMap(([page, sections]) =>
  Object.entries(sections).flatMap(([section, names]) => names.map((name) => Object.freeze({
    key: `${page}.${section}.${name}`, page, section, label: name,
    maxLength: name === 'title' ? 180 : name === 'description' ? 500 : name.endsWith('Label') ? 160 : TEXT_LIMIT,
  }))),
));
const FIELD_MAP = new Map(CAMPAIGN_FIELDS.map((field) => [field.key, field]));

export class CampaignError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'CampaignError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
function fail(code, message, status = 400) { throw new CampaignError(code, message, status); }
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('invalid_object', `Invalid ${label}.`);
  return value;
}
function only(value, allowed, label) {
  object(value, label);
  for (const key of Object.keys(value)) {
    if (FORBIDDEN.has(key) || !allowed.includes(key)) fail('unknown_field', `Unsupported field in ${label}.`);
  }
}
function text(value, limit, label) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > limit ||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) fail('invalid_text', `Invalid ${label}.`);
  return value;
}
export function campaignId(value) {
  if (typeof value !== 'string' || !UUID.test(value)) fail('invalid_campaign_id', 'Invalid campaign identifier.');
  return value.toLowerCase();
}
export function revisionNumber(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail('invalid_revision', 'Invalid revision.');
  return value;
}
export function validateEditorialName(value) {
  text(value, 160, 'editorial name');
  if (/[\r\n]/.test(value)) fail('invalid_name', 'Editorial names must be on one line.');
  return value.trim();
}
function color(value) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) fail('invalid_color', 'Colors must use six-digit hexadecimal values.');
  return value.toUpperCase();
}
function luminance(value) {
  const hex = color(value).slice(1);
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrastRatio(a, b) {
  const aa = luminance(a); const bb = luminance(b);
  return (Math.max(aa, bb) + 0.05) / (Math.min(aa, bb) + 0.05);
}
export function contrastProblems(theme) {
  const pairs = [
    ['text', 'background', 4.5], ['text', 'surface', 4.5],
    ['mutedText', 'background', 4.5], ['mutedText', 'surface', 4.5],
    ['link', 'background', 4.5], ['link', 'surface', 4.5],
    ['primaryText', 'primary', 4.5], ['secondaryText', 'secondary', 4.5],
    ['focus', 'background', 3], ['focus', 'surface', 3],
  ];
  return pairs.map(([foreground, background, minimum]) => ({
    foreground, background, minimum, ratio: contrastRatio(theme[foreground], theme[background]),
  })).filter((pair) => pair.ratio < pair.minimum);
}
export function validateTheme(value, { publishing = false } = {}) {
  only(value, THEME_TOKENS, 'theme');
  const normalized = Object.fromEntries(THEME_TOKENS.map((key) => [key, color(value[key])]));
  if (publishing && contrastProblems(normalized).length) fail('insufficient_contrast', 'Theme has inaccessible text or focus color pairs.');
  return normalized;
}
export function validateHero(value) {
  const keys = ['assetPath', 'alt', 'focalX', 'focalY', 'mobileFocalX', 'mobileFocalY'];
  only(value, keys, 'hero');
  if (typeof value.assetPath !== 'string' || value.assetPath.length > 256 ||
      !/^\/(?:assets|campaign-media)\/[A-Za-z0-9_/-]+\.(?:webp|png|jpg|jpeg|avif)$/.test(value.assetPath) ||
      value.assetPath.includes('//')) fail('invalid_asset', 'Choose an approved same-origin raster image.');
  const result = { assetPath: value.assetPath, alt: text(value.alt, 500, 'image description') };
  for (const key of keys.slice(2)) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0 || value[key] > 100) {
      fail('invalid_focal_point', 'Image focal positions must be between 0 and 100.');
    }
    result[key] = value[key];
  }
  return result;
}
export function validateCampaignDocument(value, { publishing = false } = {}) {
  only(value, ['schemaVersion', 'internalName', 'fields', 'theme', 'hero'], 'campaign document');
  if (value.schemaVersion !== CAMPAIGN_SCHEMA_VERSION) fail('unknown_schema', 'Unsupported campaign content version.');
  const internalName = validateEditorialName(value.internalName);
  object(value.fields, 'text fields');
  const fields = {};
  for (const [key, valueText] of Object.entries(value.fields)) {
    const definition = FIELD_MAP.get(key);
    if (!definition || FORBIDDEN.has(key)) fail('unknown_content_key', 'Unsupported campaign text key.');
    fields[key] = text(valueText, definition.maxLength, 'campaign text');
  }
  if (publishing && CAMPAIGN_FIELDS.some((field) => !Object.hasOwn(fields, field.key))) {
    fail('missing_content', 'Complete every required campaign field before publication.');
  }
  return {
    schemaVersion: CAMPAIGN_SCHEMA_VERSION, internalName, fields,
    theme: validateTheme(value.theme, { publishing }), hero: validateHero(value.hero),
  };
}
export function publicCampaignDocument(value) {
  const { schemaVersion, fields, theme, hero } = validateCampaignDocument(value, { publishing: true });
  return { schemaVersion, fields, theme, hero };
}
export function validatePublicCampaignDocument(value) {
  only(value, ['schemaVersion', 'fields', 'theme', 'hero'], 'published campaign');
  const { internalName: _omitted, ...result } = validateCampaignDocument({ ...value, internalName: 'Published content' }, { publishing: true });
  return result;
}
export function compareCampaignDocuments(left, right, { filter = 'all' } = {}) {
  if (!['all', 'changed', 'identical', 'missing'].includes(filter)) fail('invalid_filter', 'Unsupported comparison filter.');
  const a = validateCampaignDocument(left); const b = validateCampaignDocument(right);
  return CAMPAIGN_FIELDS.map((field) => {
    const leftValue = a.fields[field.key] ?? null; const rightValue = b.fields[field.key] ?? null;
    const state = leftValue === null || rightValue === null ? 'missing' : leftValue === rightValue ? 'identical' : 'changed';
    return { ...field, left: leftValue, right: rightValue, state };
  }).filter((row) => filter === 'all' || row.state === filter);
}
function selection(value) {
  only(value, ['campaignId', 'revision'], 'release selection');
  return { campaignId: campaignId(value.campaignId), revision: revisionNumber(value.revision) };
}
export function validateCampaignSettings(value) {
  only(value, ['schemaVersion', 'modeSwitching', 'default', 'day', 'night'], 'campaign settings');
  if (value.schemaVersion !== 1 || typeof value.modeSwitching !== 'boolean') fail('invalid_settings', 'Invalid campaign settings.');
  const result = {
    schemaVersion: 1, modeSwitching: value.modeSwitching, default: selection(value.default),
    day: value.day == null ? null : selection(value.day), night: value.night == null ? null : selection(value.night),
  };
  if (result.modeSwitching && (!result.day || !result.night)) fail('missing_mode_assignment', 'Assign published day and night campaigns before enabling modes.');
  return result;
}
export function resolveCampaignSelection(value, { preference = 'system', systemMode = null } = {}) {
  const settings = validateCampaignSettings(value);
  if (!settings.modeSwitching) return { ...settings.default, mode: 'default' };
  const normalized = preference === 'day' || preference === 'night' ? preference : 'system';
  const mode = normalized === 'system' ? (systemMode === 'night' ? 'night' : 'day') : normalized;
  return { ...settings[mode], mode };
}
export function escapeCampaignText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
export function renderCampaignText(document, key, { lineBreaks = false } = {}) {
  if (!FIELD_MAP.has(key) || !Object.hasOwn(document.fields, key)) fail('missing_content', 'Campaign text is unavailable.', 503);
  const encoded = escapeCampaignText(document.fields[key]);
  return lineBreaks ? encoded.replace(/\r?\n/g, '<br>') : encoded;
}
export function campaignThemeCss(theme) {
  const normalized = validateTheme(theme, { publishing: true });
  return ':root{' + THEME_TOKENS.map((key) => '--campaign-' + key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase()) + ':' + normalized[key] + ';').join('') + '}';
}
