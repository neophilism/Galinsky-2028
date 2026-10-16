import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_FIELDS, THEME_TOKENS, CampaignError, validateCampaignDocument,
  publicCampaignDocument, validatePublicCampaignDocument, compareCampaignDocuments,
  validateCampaignSettings, resolveCampaignSelection, contrastRatio, contrastProblems,
  validateTheme, validateHero, campaignId, revisionNumber, renderCampaignText, campaignThemeCss,
} from '../packages/core/campaign-content.mjs';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture() {
  return {
    schemaVersion: 1, internalName: 'Synthetic example',
    fields: Object.fromEntries(CAMPAIGN_FIELDS.map(({ key }) => [key, 'Synthetic text'])),
    theme: Object.fromEntries(THEME_TOKENS.map((key) => [key,
      ['background', 'surface', 'primaryText', 'secondaryText'].includes(key) ? '#FFFFFF' : '#000000'])),
    hero: { assetPath: '/assets/test.webp', alt: 'Synthetic test image', focalX: 50, focalY: 40, mobileFocalX: 50, mobileFocalY: 20 },
  };
}
function settings(enabled = true) {
  return { schemaVersion: 1, modeSwitching: enabled, default: { campaignId: id(1), revision: 1 }, day: { campaignId: id(2), revision: 2 }, night: { campaignId: id(3), revision: 3 } };
}
function rejects(code, callback) {
  assert.throws(callback, (error) => error instanceof CampaignError && error.code === code);
}
test('all public marketing pages have unique stable generic keys and metadata', () => {
  assert.equal(new Set(CAMPAIGN_FIELDS.map(({ key }) => key)).size, CAMPAIGN_FIELDS.length);
  for (const page of ['home', 'issues', 'issue-freedom', 'issue-repair', 'issue-opportunity', 'volunteer', 'donate']) {
    assert.ok(CAMPAIGN_FIELDS.some(({ key }) => key === page + '.metadata.title'));
    assert.ok(CAMPAIGN_FIELDS.some(({ key }) => key === page + '.metadata.description'));
  }
});
test('valid complete document round trips without mutating caller', () => {
  const original = fixture(); const result = validateCampaignDocument(original, { publishing: true });
  assert.deepEqual(result, original); result.fields['home.hero.headline'] = 'Other';
  assert.notEqual(original.fields['home.hero.headline'], 'Other');
});
test('partial drafts save but cannot publish', () => {
  const draft = fixture(); delete draft.fields['home.hero.headline'];
  validateCampaignDocument(draft); rejects('missing_content', () => publicCampaignDocument(draft));
});
test('public projection contains no private label and rejects smuggled metadata', () => {
  const document = fixture(); document.internalName = 'Private synthetic label';
  const result = publicCampaignDocument(document);
  assert.equal(Object.hasOwn(result, 'internalName'), false);
  assert.equal(JSON.stringify(result).includes(document.internalName), false);
  assert.deepEqual(validatePublicCampaignDocument(result), result);
  rejects('unknown_field', () => validatePublicCampaignDocument({ ...result, internalName: 'No' }));
});
test('unknown schemas, executable styling and unknown fields are rejected', () => {
  rejects('unknown_schema', () => validateCampaignDocument({ ...fixture(), schemaVersion: 99 }));
  rejects('unknown_field', () => validateCampaignDocument({ ...fixture(), script: 'alert(1)' }));
  const value = fixture(); value.fields['arbitrary.key'] = 'x';
  rejects('unknown_content_key', () => validateCampaignDocument(value));
  rejects('unknown_field', () => validateTheme({ ...fixture().theme, css: 'body{display:none}' }));
});
test('prototype properties and non-plain records are rejected', () => {
  const value = fixture(); value.fields = JSON.parse('{"__proto__":"bad"}');
  rejects('unknown_content_key', () => validateCampaignDocument(value));
  rejects('invalid_object', () => validateCampaignDocument(new Date()));
});
test('strings are bounded, nonempty, control-safe, and names are one line', () => {
  for (const bad of ['', ' ', 5, null, 'a\u0000b', 'a'.repeat(7000)]) {
    const value = fixture(); value.fields['home.hero.body'] = bad;
    rejects('invalid_text', () => validateCampaignDocument(value));
  }
  rejects('invalid_name', () => validateCampaignDocument({ ...fixture(), internalName: 'A\nB' }));
});
test('stored markup is plain text and safely escaped in both rendering modes', () => {
  const value = fixture(); value.fields['home.hero.headline'] = '<img src=x onerror="bad">\nA & B';
  const clean = validateCampaignDocument(value);
  assert.equal(renderCampaignText(clean, 'home.hero.headline'), '&lt;img src=x onerror=&quot;bad&quot;&gt;\nA &amp; B');
  assert.equal(renderCampaignText(clean, 'home.hero.headline', { lineBreaks: true }).includes('<br>'), true);
  rejects('missing_content', () => renderCampaignText(clean, 'invalid.key'));
});
test('theme contrast uses WCAG luminance and refuses unreadable publication', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
  assert.equal(contrastRatio('#888888', '#888888'), 1);
  assert.deepEqual(contrastProblems(fixture().theme), []);
  const theme = { ...fixture().theme, text: '#FFFFFF' };
  validateTheme(theme); rejects('insufficient_contrast', () => validateTheme(theme, { publishing: true }));
  assert.ok(contrastProblems(theme).some(({ foreground }) => foreground === 'text'));
});
test('theme CSS contains only allowlisted color variables', () => {
  const css = campaignThemeCss(fixture().theme);
  assert.ok(css.startsWith(':root{--campaign-background:#FFFFFF;'));
  assert.ok(css.includes('--campaign-muted-text:'));
  for (const bad of ['red', '#fff', 'url(x)', '#000000;display:none', null]) {
    rejects('invalid_color', () => campaignThemeCss({ ...fixture().theme, text: bad }));
  }
});
test('hero selection rejects remote urls, traversal, svg, data, query and control input', () => {
  const hero = fixture().hero;
  for (const assetPath of ['https://example.org/x.png', '/assets/../x.png', '/assets//x.png', '/assets/x.svg', 'data:image/png,x', '/assets/x.png?token=x', '/assets/%2e%2e/x.png', '/assets/x.png\n']) {
    rejects('invalid_asset', () => validateHero({ ...hero, assetPath }));
  }
  for (const bad of [-1, 101, NaN, Infinity, '50', null]) {
    rejects('invalid_focal_point', () => validateHero({ ...hero, focalX: bad }));
  }
  assert.equal(validateHero({ ...hero, assetPath: '/campaign-media/test.webp' }).assetPath, '/campaign-media/test.webp');
});
test('arbitrary pairs compare by stable key with changed, identical and missing filters', () => {
  const a = fixture(); const b = fixture(); b.fields['home.hero.headline'] = 'Different';
  delete b.fields['home.hero.body'];
  const all = compareCampaignDocuments(a, b);
  assert.equal(all.length, CAMPAIGN_FIELDS.length);
  assert.equal(compareCampaignDocuments(a, b, { filter: 'changed' }).length, 1);
  assert.equal(compareCampaignDocuments(a, b, { filter: 'missing' }).length, 1);
  assert.equal(compareCampaignDocuments(a, a, { filter: 'identical' }).length, CAMPAIGN_FIELDS.length);
  rejects('invalid_filter', () => compareCampaignDocuments(a, b, { filter: 'bad' }));
});
test('no two-campaign cap: any UUID can be selected independently for any mode', () => {
  for (let n = 1; n <= 50; n++) {
    const value = settings(); value.night = { campaignId: id(n), revision: n };
    assert.equal(resolveCampaignSelection(value, { preference: 'night' }).campaignId, id(n));
  }
});
test('disabled appearance switching always returns default despite saved preferences', () => {
  for (const preference of ['day', 'night', 'system', '', 'invalid', null]) {
    assert.deepEqual(resolveCampaignSelection(settings(false), { preference, systemMode: 'night' }), { campaignId: id(1), revision: 1, mode: 'default' });
  }
});
test('manual choice overrides system, unknown preferences default deterministically', () => {
  const value = settings();
  assert.equal(resolveCampaignSelection(value, { preference: 'day', systemMode: 'night' }).campaignId, id(2));
  assert.equal(resolveCampaignSelection(value, { preference: 'night', systemMode: 'day' }).campaignId, id(3));
  assert.equal(resolveCampaignSelection(value, { preference: 'system', systemMode: 'night' }).campaignId, id(3));
  assert.equal(resolveCampaignSelection(value, { preference: 'bogus', systemMode: null }).campaignId, id(2));
});
test('same campaign may be assigned to all modes; missing modes cannot enable', () => {
  const value = settings(); value.day = value.default; value.night = value.default;
  assert.equal(resolveCampaignSelection(value, { preference: 'night' }).campaignId, id(1));
  rejects('missing_mode_assignment', () => validateCampaignSettings({ ...value, day: null }));
  validateCampaignSettings({ ...value, modeSwitching: false, day: null, night: null });
});
test('release identifiers and settings reject malformed values and unknown keys', () => {
  for (const bad of ['arbitrary-name', '', '00000000-0000-0000-0000-000000000000', null]) rejects('invalid_campaign_id', () => campaignId(bad));
  for (const bad of [0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1]) rejects('invalid_revision', () => revisionNumber(bad));
  rejects('unknown_field', () => validateCampaignSettings({ ...settings(), script: 'bad' }));
});
