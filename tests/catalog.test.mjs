import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readCatalog, productHref, productView, safeWebUrl } from '../catalog.mjs';

const config = JSON.parse(await readFile(new URL('../site.config.json', import.meta.url), 'utf8'));
const catalog = readCatalog(config);
const script = await readFile(new URL('../script.js', import.meta.url), 'utf8');

test('only the five selected repositories appear, in the chosen order', () => {
  assert.equal(catalog.invalidCount, 0);
  assert.equal(catalog.profile, 'https://github.com/shuhuihuang0704');
  assert.deepEqual(catalog.products.map(p => p.repo.split('/')[1]), [
    'IELTS-Pass', 'what-to-eat', 'quzhao-playpaw', 'resumeweave', 'exportflow-app',
  ]);
  assert.ok(catalog.products.every(p => p.kind === 'app'));
});

test('the empty GitHub placeholder is excluded from automatic product sync', () => {
  assert.ok(catalog.github.exclude.includes('shuhuihuang0704/-'));
});

test('every product has a unique, shareable detail page and offline links', () => {
  assert.equal(new Set(catalog.products.map(productHref)).size, 5);
  for (const product of catalog.products) {
    const url = new URL(productHref(product), 'http://localhost:4173');
    assert.equal(url.pathname, '/product.html');
    assert.equal(url.searchParams.get('id'), product.id);
    const view = productView(product);
    assert.equal(view.repoUrl, `https://github.com/${product.repo}`);
    assert.ok(view.website.startsWith('https://'));
    assert.ok(view.description.length > 10);
  }
});

test('each app uses a lightweight scene-specific illustration asset', async () => {
  const labels = new Map([
    ['ielts-pass', '雅思学习应用插画'],
    ['what-to-eat', '食材与菜谱应用插画'],
    ['quzhao-playpaw', '宠物玩具应用插画'],
    ['resumeweave', '简历制作应用插画'],
    ['exportflow-app', '出口业务工作台插画'],
  ]);
  for (const product of catalog.products) {
    assert.match(product.image, /\.svg$/);
    const svg = await readFile(new URL(product.image.replace(/^\.\//, ''), new URL('../', import.meta.url)), 'utf8');
    assert.match(svg, /<svg\b[^>]*viewBox="0 0 600 600"/);
    assert.ok(svg.includes(`aria-label="${labels.get(product.id)}"`));
  }
});

test('each scene illustration includes the existing Craberry mascot accent', () => {
  assert.match(script, /mascot\.src = '\.\/assets\/craberry-leaning\.png'/);
  assert.match(script, /visual\.append\(image, mascot\)/);
  assert.match(script, /mascot\.setAttribute\('aria-hidden', 'true'\)/);
});

test('fresh GitHub description and homepage take priority over offline snapshots', () => {
  const view = productView(catalog.products[0], {
    name: 'Latest name', description: '最新简介', homepage: 'https://example.com/new',
    pushed_at: '2026-09-18T05:34:46Z', stargazers_count: 0,
  });
  assert.equal(view.name, 'Latest name');
  assert.equal(view.description, '最新简介');
  assert.equal(view.website, 'https://example.com/new');
  assert.ok(view.updated);
  assert.equal(view.stars, 0);
});

test('unsafe links and unrecognized product kinds are not accepted', () => {
  assert.equal(safeWebUrl('javascript:alert(1)'), '');
  assert.equal(safeWebUrl('https://user:password@example.com'), '');
  assert.equal(readCatalog({ products: [{ kind: 'app', repo: 'https://evil.test/a/b' }] }).products.length, 0);
  assert.equal(readCatalog({ products: [{ kind: 'other', repo: 'owner/repo' }] }).products.length, 0);
});
