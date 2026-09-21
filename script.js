import { fetchJson, fetchRepo, productHref, productView, readArticles, readCatalog, syncGithubCatalog } from './catalog.mjs';

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const progressBar = document.querySelector('.scroll-progress span');
const shovelPointer = document.querySelector('[data-shovel-pointer]');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const shovelContentSelector = '.menu-panel:not([hidden]), .detail-main';
document.documentElement.classList.toggle('has-shovel-cursor', finePointer.matches && Boolean(shovelPointer));
finePointer.addEventListener('change', (event) => {
  document.documentElement.classList.toggle('has-shovel-cursor', event.matches && Boolean(shovelPointer));
  if (!event.matches) shovelPointer?.classList.remove('is-active');
});

document.addEventListener('pointermove', (event) => {
  if (!shovelPointer || !finePointer.matches || event.pointerType === 'touch') return;
  const target = event.target instanceof Element ? event.target.closest(shovelContentSelector) : null;
  if (!target) {
    shovelPointer.classList.remove('is-active');
    return;
  }
  shovelPointer.style.transform = `translate3d(${(event.clientX - 10).toFixed(1)}px, ${(event.clientY - 6).toFixed(1)}px, 0) rotate(-18deg)`;
  shovelPointer.classList.add('is-active');
}, { passive: true });

document.addEventListener('pointerout', (event) => {
  if (!event.relatedTarget) shovelPointer?.classList.remove('is-active');
}, { passive: true });

window.addEventListener('blur', () => shovelPointer?.classList.remove('is-active'));

function bindMotionCards(root = document) {
  root.querySelectorAll('[data-motion-card]:not([data-motion-bound])').forEach((card) => {
    card.dataset.motionBound = 'true';
    const reset = () => {
      card.style.setProperty('--pointer-x', '0');
      card.style.setProperty('--pointer-y', '0');
      card.style.setProperty('--motion-rotate-x', '0deg');
      card.style.setProperty('--motion-rotate-y', '0deg');
      card.classList.remove('is-pointer-active');
    };
    card.addEventListener('pointermove', (event) => {
      if (motionPreference.matches || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      card.style.setProperty('--pointer-x', x.toFixed(3));
      card.style.setProperty('--pointer-y', y.toFixed(3));
      card.style.setProperty('--motion-rotate-x', `${(-y * 2.6).toFixed(2)}deg`);
      card.style.setProperty('--motion-rotate-y', `${(x * 3.2).toFixed(2)}deg`);
      card.classList.add('is-pointer-active');
    });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointercancel', reset);
    motionPreference.addEventListener('change', (event) => { if (event.matches) reset(); });
  });
}

bindMotionCards();

function updateScrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (progressBar) progressBar.style.width = `${max > 0 ? Math.min(100, window.scrollY / max * 100) : 0}%`;
}
window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('resize', updateScrollProgress);
window.addEventListener('load', updateScrollProgress);

const hero = document.querySelector('.hero');
const productsPage = document.querySelector('#products');
const pageTurnTrigger = document.querySelector('[data-page-turn-trigger]');
let pageTurnTimer = 0;
function finishHeroPageTurn() {
  if (!hero?.classList.contains('is-page-turn-outgoing')) return;
  window.clearTimeout(pageTurnTimer);
  hero.classList.remove('is-page-turn-outgoing');
  productsPage?.classList.remove('is-page-turn-underlay');
  document.body.classList.remove('page-turn-in-progress');
  productsPage?.scrollIntoView({ behavior: 'instant', block: 'start' });
  document.querySelector('[data-menu-tab="skill"]')?.focus({ preventScroll: true });
}
pageTurnTrigger?.addEventListener('click', (event) => {
  if (motionPreference.matches || !hero || !productsPage || hero.classList.contains('is-page-turn-outgoing')) return;
  event.preventDefault();
  history.pushState(null, '', '#products');
  document.body.classList.add('page-turn-in-progress');
  productsPage.classList.add('is-page-turn-underlay');
  hero.classList.add('is-page-turn-outgoing');
  pageTurnTimer = window.setTimeout(finishHeroPageTurn, 1000);
});
hero?.addEventListener('animationend', (event) => {
  if (event.animationName !== 'hero-page-lift') return;
  finishHeroPageTurn();
});

const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
const menuTabs = document.querySelectorAll('[data-menu-tab]');
const menuPanels = document.querySelectorAll('[data-menu-panel]');
let menuFlipTimer = 0;
function selectMenuTab(kind, shouldScroll = false) {
  if (menuFlipTimer) return;
  const tab = document.querySelector(`[data-menu-tab="${kind}"]`);
  if (!tab) return;
  const currentTab = document.querySelector('[data-menu-tab][aria-selected="true"]');
  const currentPanel = currentTab && document.querySelector(`[data-menu-panel="${currentTab.dataset.menuTab}"]`);
  const nextPanel = document.querySelector(`[data-menu-panel="${kind}"]`);
  const flipSkillsToApp = currentTab?.dataset.menuTab === 'skill' && kind === 'app' && currentPanel && nextPanel && !motionPreference.matches;
  menuTabs.forEach((item) => {
    const selected = item === tab;
    item.classList.toggle('is-active', selected);
    item.setAttribute('aria-selected', String(selected));
  });
  if (flipSkillsToApp) {
    const panels = document.querySelector('.menu-panels');
    nextPanel.hidden = false;
    const nextPanelStyle = nextPanel.getAttribute('style');
    Object.assign(nextPanel.style, { position: 'absolute', inset: '0 auto auto 0', width: '100%', visibility: 'hidden' });
    const height = Math.max(currentPanel.scrollHeight, nextPanel.scrollHeight);
    if (nextPanelStyle === null) nextPanel.removeAttribute('style');
    else nextPanel.setAttribute('style', nextPanelStyle);
    panels.style.height = `${height}px`;
    panels.classList.add('is-page-flipping');
    currentPanel.classList.add('is-flipping-out-right');
    nextPanel.classList.add('is-flipping-in-from-left');
    menuTabs.forEach((item) => { item.disabled = true; });
    menuFlipTimer = window.setTimeout(() => {
      menuPanels.forEach((panel) => {
        panel.hidden = panel !== nextPanel;
        panel.classList.remove('is-flipping-out-right', 'is-flipping-in-from-left');
      });
      panels.classList.remove('is-page-flipping');
      panels.style.height = '';
      menuTabs.forEach((item) => { item.disabled = false; });
      menuFlipTimer = 0;
      updateScrollProgress();
    }, 680);
  } else {
    menuPanels.forEach((panel) => { panel.hidden = panel.dataset.menuPanel !== kind; });
  }
  if (shouldScroll) document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateScrollProgress();
}
menuTabs.forEach((tab) => tab.addEventListener('click', () => selectMenuTab(tab.dataset.menuTab)));
document.querySelectorAll('[data-menu-jump]').forEach((link) => {
  link.addEventListener('click', () => selectMenuTab(link.dataset.menuJump, true));
});
document.addEventListener('keydown', (event) => {
  if (!event.target.matches?.('[data-menu-tab]') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  const index = [...menuTabs].indexOf(event.target);
  const next = event.key === 'ArrowRight' ? (index + 1) % menuTabs.length : (index - 1 + menuTabs.length) % menuTabs.length;
  menuTabs[next].focus();
  selectMenuTab(menuTabs[next].dataset.menuTab);
});
function closeMenu(returnFocus = false) {
  if (!mobileMenu) return;
  mobileMenu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', '打开菜单');
  if (returnFocus) menuToggle.focus();
}
menuToggle?.addEventListener('click', () => {
  const opening = mobileMenu.hidden;
  mobileMenu.hidden = !opening;
  menuToggle.setAttribute('aria-expanded', String(opening));
  menuToggle.setAttribute('aria-label', opening ? '关闭菜单' : '打开菜单');
});
mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenu && !mobileMenu.hidden) closeMenu(true);
});
document.addEventListener('click', (event) => {
  if (mobileMenu && !mobileMenu.hidden && !event.target.closest('.topbar')) closeMenu();
});
window.matchMedia('(min-width: 761px)').addEventListener('change', (event) => {
  if (event.matches) closeMenu();
});

// Keep old homepage bookmarks useful after removing the previous sections.
if (document.body.dataset.page !== 'product' && ['#about', '#work', '#github', '#contact'].includes(location.hash)) {
  history.replaceState(null, '', '#products');
  document.querySelector('#products')?.scrollIntoView({ behavior: 'instant' });
}

function element(tag, className, value) {
  const node = document.createElement(tag);
  node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

function fillCard(card, product, data) {
  const view = productView(product, data);
  card.setAttribute('aria-label', `${view.name}，查看产品详情`);
  card.querySelector('h4').textContent = view.name;
  card.querySelector('.product-description').textContent = view.description;
  card.querySelector('.product-update').textContent = view.updated ? `更新于 ${view.updated}` : 'GITHUB PROJECT';
  const websiteLink = card.querySelector('.product-website');
  if (websiteLink) {
    websiteLink.hidden = !view.website;
    if (view.website) websiteLink.href = view.website;
  }
}

function makeCard(product) {
  const card = element('article', 'product-card');
  card.dataset.motionCard = 'true';
  if (product.image) {
    const visual = element('div', 'product-image-wrap');
    const image = document.createElement('img');
    image.className = 'product-card-image';
    image.src = product.image;
    image.alt = `${product.name || product.repo.split('/')[1]} 生活场景插画`;
    image.loading = 'lazy';
    const mascot = document.createElement('img');
    mascot.className = 'product-card-mascot';
    mascot.src = './assets/craberry-leaning.png';
    mascot.alt = '';
    mascot.setAttribute('aria-hidden', 'true');
    mascot.dataset.mascotPose = product.id;
    mascot.loading = 'lazy';
    visual.append(image, mascot);
    card.append(visual);
  }
  const top = element('div', 'product-card-top');
  top.append(element('span', 'product-type', product.kind.toUpperCase()), element('span', 'card-arrow', '↗'));
  const footer = element('div', 'product-footer');
  const actions = element('div', 'product-actions');
  const githubLink = element('a', 'card-action', 'GitHub ↗');
  githubLink.href = `https://github.com/${product.repo}`;
  githubLink.target = '_blank';
  githubLink.rel = 'noopener noreferrer';
  const websiteLink = element('a', 'card-action card-action-primary product-website', '浏览 APP ↗');
  websiteLink.target = '_blank';
  websiteLink.rel = 'noopener noreferrer';
  actions.append(githubLink, websiteLink);
  footer.append(element('span', 'product-update'), actions);
  card.append(top, element('h4', 'highlight-title'), element('p', 'product-description'), footer, element('p', 'product-repo', product.repo));
  fillCard(card, product);
  return card;
}

function showArticles(config) {
  const list = document.querySelector('[data-article-list]');
  if (!list) return;
  const articles = readArticles(config);
  list.replaceChildren(...articles.map((article) => {
    const link = element('a', 'article-card');
    link.dataset.motionCard = 'true';
    link.href = article.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    const cover = element('span', 'article-cover');
    if (article.cover) {
      const image = document.createElement('img');
      image.className = 'article-cover-image';
      image.src = article.cover;
      image.alt = `${article.title} 的小红书封面`;
      image.loading = 'lazy';
      cover.append(image);
    }
    const copy = element('span', 'article-card-copy');
    copy.append(
      element('span', 'article-card-meta', `${article.meta} · ${article.author}`),
      element('strong', 'highlight-title', article.title),
      element('span', '', article.summary),
    );
    link.append(cover, copy);
    return link;
  }));
  bindMotionCards(list);
}

function bindGithubLinks(catalog) {
  const repos = catalog.products.map((product) => product.repo);
  const owners = new Set(repos.map((repo) => repo.split('/')[0].toLowerCase()));
  const href = catalog.profile || (owners.size === 1 ? `https://github.com/${repos[0].split('/')[0]}` : '');
  document.querySelectorAll('[data-github-link]').forEach((link) => {
    link.hidden = !href;
    if (href) link.href = href;
  });
}

async function showCatalog(catalog) {
  bindGithubLinks(catalog);
  const cards = new Map();
  for (const kind of ['skill', 'app']) {
    const list = document.querySelector(`[data-product-list="${kind}"]`);
    const products = catalog.products.filter((product) => product.kind === kind);
    if (!products.length) continue;
    list.replaceChildren(...products.map((product) => {
      const card = makeCard(product);
      cards.set(product.id, card);
      return card;
    }));
  }
  bindMotionCards();
  updateScrollProgress();
  const status = document.querySelector('.catalog-status');
  const warnings = catalog.invalidCount ? ['部分产品配置有误，暂未显示。'] : [];
  if (catalog.githubSync?.failed) warnings.push('GitHub 暂时无法同步，当前显示已保存产品。');
  if (catalog.githubSync?.enabled && !catalog.githubSync.failed) {
    warnings.push(catalog.githubSync.added
      ? `GitHub 已同步，新增 ${catalog.githubSync.added} 个公开仓库。`
      : 'GitHub 已同步到最新公开仓库。');
  }
  status.textContent = warnings.join(' ');
  const results = await Promise.allSettled(catalog.products.map(async (product) => {
    const data = product.remoteData || await fetchRepo(product);
    fillCard(cards.get(product.id), product, data);
  }));
  if (results.some((result) => result.status === 'rejected')) {
    warnings.push('部分 GitHub 信息暂未更新，仍可查看产品与仓库。');
  }
  status.textContent = warnings.join(' ');
  updateScrollProgress();
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function fillDetail(product, data) {
  const view = productView(product, data);
  document.title = `${view.name} · 蟹黄堡`;
  document.querySelector('meta[name="description"]').content = view.description;
  setText('[data-detail-kind]', view.kind.toUpperCase());
  setText('[data-detail-name]', view.name);
  setText('[data-detail-description]', view.description);
  setText('[data-detail-about]', view.about || view.description);
  setText('[data-detail-usage]', view.usage || (view.kind === 'skill'
    ? '请前往仓库查看 README 中的安装步骤和使用说明。'
    : '如果产品提供在线版本，可以通过「打开 App」体验。部署与使用说明请查看仓库 README。'));
  document.querySelector('[data-detail-repo]').href = view.repoUrl;
  const repoName = document.querySelector('[data-detail-repo-name]');
  repoName.textContent = view.repo;
  repoName.href = view.repoUrl;
  document.querySelector('[data-detail-readme]').href = `${view.repoUrl}#readme`;
  const website = document.querySelector('[data-detail-website]');
  website.hidden = !view.website;
  if (view.website) website.href = view.website;
  setText('[data-detail-updated]', view.updated || (data ? '未提供' : '读取中…'));
  for (const key of ['language', 'license', 'stars']) {
    const value = view[key];
    document.querySelector(`[data-${key}-row]`).hidden = value === null || value === '';
    setText(`[data-detail-${key}]`, value === null ? '' : String(value));
  }
  document.querySelector('[data-features-section]').hidden = !view.features.length;
  document.querySelector('[data-detail-features]').replaceChildren(...view.features.map((feature) => element('li', '', feature)));
  document.querySelector('[data-detail-state]').hidden = true;
  document.querySelector('[data-product-detail]').hidden = false;
  updateScrollProgress();
}

function detailError(title, description) {
  document.querySelector('[data-product-detail]').hidden = true;
  document.querySelector('[data-detail-state]').hidden = false;
  setText('[data-state-title]', title);
  setText('[data-state-description]', description);
  document.title = `${title} · 蟹黄堡`;
}

async function showDetail(catalog) {
  const id = new URLSearchParams(location.search).get('id');
  const product = catalog.products.find((item) => item.id === id);
  if (!product) {
    detailError('还没有这个产品。', '这个链接对应的产品尚未上架，或已经移除。可以返回产品菜单看看。');
    return;
  }
  fillDetail(product);
  try {
    fillDetail(product, await fetchRepo(product));
    setText('[data-detail-sync]', '已读取 GitHub 最新信息。每次打开页面时更新。');
  } catch {
    setText('[data-detail-updated]', '暂未获取');
    setText('[data-detail-sync]', '暂时无法同步 GitHub，先展示本站介绍；仓库链接仍可访问。');
  }
}

async function init() {
  try {
    const config = await fetchJson('./site.config.json');
    showArticles(config);
    let catalog = readCatalog(config);
    if (document.body.dataset.page === 'product') {
      await showDetail(catalog);
    } else {
      try {
        catalog = await syncGithubCatalog(catalog);
      } catch {
        catalog.githubSync = { enabled: true, added: 0, failed: true };
      }
      await showCatalog(catalog);
      if (catalog.github?.autoSync) {
        window.setInterval(async () => {
          try {
            const latestConfig = await fetchJson('./site.config.json');
            const latest = await syncGithubCatalog(readCatalog(latestConfig));
            if (latest.products.length !== catalog.products.length) {
              catalog = latest;
              await showCatalog(catalog);
            }
          } catch { /* keep the last successful catalog on transient API failures */ }
        }, 5 * 60 * 1000);
      }
    }
  } catch {
    if (document.body.dataset.page === 'product') {
      detailError('产品暂时没加载出来。', '请刷新重试，或返回产品菜单。');
    } else {
      setText('.catalog-status', '产品配置暂时无法读取，请刷新重试。');
    }
  }
  updateScrollProgress();
}
init();
