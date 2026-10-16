import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('apps/web/public/assets/public.js', 'utf8');
function element(tag) {
  return {
    tag,
    children: [],
    listeners: {},
    dataset: {},
    attrs: {},
    append(...x) {
      this.children.push(...x);
    },
    replaceChildren(...x) {
      this.children = x;
    },
    after(x) {
      this.sibling = x;
    },
    remove() {
      this.removed = true;
    },
    focus() {
      this.focused = true;
    },
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    addEventListener(k, fn) {
      this.listeners[k] = fn;
    },
  };
}
function execute({ amount = '25', video = 'abcDEF123_-' } = {}) {
  const checkout = element('a'),
    button = element('button'),
    panel = element('div');
  panel.dataset = { video, title: 'Issue introduction' };
  const original = [button, element('img')];
  panel.childNodes = original;
  button.closest = () => panel;
  const document = {
    querySelector: (s) => (s === '.donate-form [href="/donate/continue"]' ? checkout : null),
    querySelectorAll: (s) => (s === '.video-play' ? [button] : []),
    addEventListener() {},
    createElement: element,
  };
  vm.runInNewContext(source, {
    document,
    location: {
      search: '?amount=' + encodeURIComponent(amount),
      href: 'https://campaign.example.test/donate/',
    },
    URLSearchParams,
    URL,
    Intl,
  });
  return { checkout, button, panel, original };
}
test('selected donation amount propagates as a decimal and malformed amounts do not', () => {
  for (const amount of ['25', '100', '12.50', '1.01'])
    assert.equal(execute({ amount }).checkout.attrs.href, '/donate/continue?amount=' + amount);
  for (const amount of ['0', '-1', '25.001', '1e3', '<script>', '1&admin=true'])
    assert.equal(execute({ amount }).checkout.attrs.href, undefined);
});
test('video activation is reversible and restores original controls with focus', () => {
  const { button, panel, original } = execute();
  assert.equal(panel.sibling, undefined, 'No third-party frame before activation');
  button.listeners.click();
  const iframe = panel.children[0],
    controls = panel.sibling,
    stop = controls.children[0];
  assert.equal(iframe.src, 'https://www.youtube-nocookie.com/embed/abcDEF123_-?autoplay=1&rel=0');
  assert.equal(iframe.attrs.sandbox, 'allow-scripts allow-same-origin allow-presentation');
  assert.equal(stop.focused, true);
  stop.listeners.click();
  assert.equal(iframe.removed, true);
  assert.deepEqual(panel.children, original);
  assert.equal(controls.removed, true);
  assert.equal(button.focused, true);
  button.listeners.click();
  assert.notEqual(panel.children[0], iframe);
  assert.equal(panel.children.length, 1);
});
test('an invalid video cannot create an external player', () => {
  const { button, panel } = execute({ video: 'https://evil.test' });
  button.listeners.click();
  assert.equal(panel.sibling, undefined);
  assert.deepEqual(panel.children, []);
});
