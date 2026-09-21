import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('styles.css', root), 'utf8');
const script = await readFile(new URL('script.js', root), 'utf8');
const productHtml = await readFile(new URL('product.html', root), 'utf8');
const cursor = await readFile(new URL('assets/shovel-cursor.svg', root), 'utf8');

test('hero stays complete and the downward link triggers a claw-driven page turn', () => {
  assert.match(html, /data-burger-base[^>]*src="\.\/assets\/craburger-3d\.png"/);
  assert.doesNotMatch(html, /data-burger-layer|class="[^"]*burger-layer/);
  assert.match(html, /data-page-turn-trigger[^>]*href="#products"/);
  assert.match(html, /data-page-turn-claw[^>]*src="\.\/assets\/crab-claw\.svg"/);
  assert.doesNotMatch(script, /burger-explode|burgerLayers|layer-opacity/);
  assert.match(script, /hero-page-lift/);
  assert.match(script, /is-page-turn-underlay/);
  assert.match(css, /@keyframes hero-page-lift/);
  assert.match(css, /@keyframes claw-push-up/);
});

test('Skills is the second-page default and APP opens with a rightward book flip', () => {
  assert.match(html, /id="tab-skills"[^>]*aria-selected="true"/);
  assert.match(html, /<section class="menu-panel" id="panel-skills"[^>]*data-menu-panel="skill"[^>]*>/);
  assert.match(html, /id="tab-apps"[^>]*aria-selected="false"/);
  assert.match(html, /data-menu-panel="app"[^>]*hidden/);
  assert.match(script, /currentTab\?\.dataset\.menuTab === 'skill' && kind === 'app'/);
  assert.match(script, /is-flipping-out-right/);
  assert.match(script, /is-flipping-in-from-left/);
  assert.match(css, /@keyframes menu-page-out-right/);
  assert.match(css, /@keyframes menu-page-in-left/);
});

test('cover is larger and content panels use a kitchen-spatula cursor', () => {
  assert.match(css, /h1\s*\{[^}]*14vw/);
  assert.match(css, /\.hero-visual\s*\{[^}]*2\.25em/);
  assert.match(css, /html\.has-shovel-cursor \.menu-panel:not\(\[hidden\]\)[^}]*cursor: none !important/);
  assert.match(html, /data-shovel-pointer/);
  assert.match(productHtml, /data-shovel-pointer/);
  assert.match(script, /document\.addEventListener\('pointermove'/);
  assert.match(script, /has-shovel-cursor/);
  assert.match(script, /shovelPointer\.classList\.add\('is-active'\)/);
  assert.match(cursor, /<svg\b[^>]*viewBox="0 0 40 40"/);
  assert.match(cursor, /<title>厨用锅铲光标<\/title>/);
  assert.match(cursor, /ffd45c/);
});
