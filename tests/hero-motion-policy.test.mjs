import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderPage} from '../scripts/public-renderer.mjs';

test('approved hero uses no visible animation pause control',()=>{
 const html=renderPage('index');
 assert(html.includes('class="flag-canvas"'));
 assert(!html.includes('motion-button'));
 assert(!html.includes('Pause background animation'));
 assert(html.includes('src="/assets/motion.js"'));
});
test('flag keeps reduced-motion and visibility suspension with capped paint cadence',()=>{
 const source=readFileSync('apps/web/public/assets/motion.js','utf8');
 assert.match(source,/prefers-reduced-motion:\s*reduce/);
 assert.match(source,/document\.hidden/);
 assert.match(source,/IntersectionObserver/);
 assert.match(source,/visibilitychange/);
 assert.match(source,/requestAnimationFrame/);
 assert.match(source,/1000\s*\/\s*15\s*:\s*1000\s*\/\s*30/);
 assert.match(source,/now - previousPaint < frameInterval/);
});
