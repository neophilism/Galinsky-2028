import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderPage} from '../scripts/public-renderer.mjs';
test('decorative flag provides a persistent keyboard-operable pause control', () => {
 const html=renderPage('index');
 assert.match(html, /id="flag-motion-toggle"[^>]*type="button"/);
 assert.match(html, /class="flag-canvas"/);
 const js=readFileSync('apps/web/public/assets/motion.js','utf8');
 assert.match(js,/localStorage\.getItem\(preferenceKey\)/);
 assert.match(js,/localStorage\.setItem\(preferenceKey/);
 assert.match(js,/!paused && visible && !document\.hidden/);
 assert.match(js,/reducedMotion\.matches \|\| paused/);
});
