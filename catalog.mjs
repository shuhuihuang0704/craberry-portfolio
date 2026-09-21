export function safeWebUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

export function extractRepo(value) {
  if (typeof value !== 'string') return '';
  let repo = value.trim();
  if (/^https?:\/\//i.test(repo)) {
    const url = new URL(repo);
    if (url.hostname !== 'github.com' || url.username || url.password || url.port) return '';
    repo = url.pathname.slice(1);
  }
  repo = repo.replace(/\/+$/, '').replace(/\.git$/, '');
  return /^[a-z\d](?:[a-z\d-]*[a-z\d])?\/[a-z\d_.-]+$/i.test(repo)
    && !['.', '..'].includes(repo.split('/')[1]) ? repo : '';
}

const text = (value) => typeof value === 'string' ? value.trim() : '';

export function readCatalog(config) {
  const rows = Array.isArray(config?.products) ? config.products : [];
  const seen = new Set();
  const products = [];
  for (const row of rows) {
    if (!row || !['skill', 'app'].includes(row.kind)) continue;
    let repo;
    try { repo = extractRepo(row.repo); } catch { continue; }
    if (!repo) continue;
    const id = text(row.id) || `${row.kind}:${repo.toLowerCase()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    products.push({
      id, repo, kind: row.kind,
      image: text(row.image),
      name: text(row.name), description: text(row.description),
      about: text(row.about), usage: text(row.usage),
      features: Array.isArray(row.features) ? row.features.map(text).filter(Boolean) : [],
      website: safeWebUrl(row.website),
      fallbackDescription: text(row.fallback?.description),
      fallbackWebsite: safeWebUrl(row.fallback?.website),
    });
  }
  let profile = safeWebUrl(config?.github?.profile);
  if (profile && new URL(profile).hostname !== 'github.com') profile = '';
  return {
    products,
    profile,
    invalidCount: rows.length - products.length,
    github: {
      autoSync: config?.github?.autoSync === true,
      repoLimit: Number.isInteger(config?.github?.repoLimit) ? Math.max(1, Math.min(100, config.github.repoLimit)) : 100,
      exclude: Array.isArray(config?.github?.exclude) ? config.github.exclude.map(text).filter(Boolean) : [],
      defaultImage: text(config?.github?.defaultImage),
    },
  };
}

export function readArticles(config) {
  if (!Array.isArray(config?.articles)) return [];
  return config.articles.flatMap((row, index) => {
    if (!row || !safeWebUrl(row.url) || !text(row.title)) return [];
    return [{
      id: text(row.id) || `article-${index + 1}`,
      url: safeWebUrl(row.url),
      cover: text(row.cover),
      title: text(row.title),
      author: text(row.author) || '蟹黄堡',
      summary: text(row.summary),
      meta: text(row.meta) || `小红书 / NOTE ${String(index + 1).padStart(2, '0')}`,
    }];
  });
}

export function productHref(product) {
  return `./product.html?${new URLSearchParams({ id: product.id })}`;
}

export function productView(product, data = {}) {
  const date = new Date(data.pushed_at || '');
  return {
    ...product,
    name: product.name || text(data.name) || product.repo.split('/')[1],
    description: product.description || text(data.description) || product.fallbackDescription || '产品介绍整理中，更多信息请查看 GitHub 仓库。',
    repoUrl: `https://github.com/${product.repo}`,
    website: product.website || (product.kind === 'app' ? safeWebUrl(data.homepage) || product.fallbackWebsite || '' : ''),
    updated: Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN'),
    language: text(data.language),
    license: text(data.license?.name),
    stars: Number.isFinite(data.stargazers_count) && data.stargazers_count >= 0 ? data.stargazers_count : null,
  };
}

export async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      cache: 'no-store', signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchRepo(product) {
  return fetchJson(`https://api.github.com/repos/${product.repo}`);
}

function profileOwner(profile) {
  try {
    const url = new URL(profile);
    const parts = url.pathname.split('/').filter(Boolean);
    return url.hostname === 'github.com' && parts.length === 1 ? parts[0] : '';
  } catch {
    return '';
  }
}

function repoKind(repo) {
  const haystack = [repo.name, repo.description, ...(Array.isArray(repo.topics) ? repo.topics : [])]
    .filter(Boolean).join(' ').toLowerCase();
  return /skill|codex|plugin/.test(haystack) ? 'skill' : 'app';
}

export async function fetchGithubRepos(profile, limit = 100) {
  const owner = profileOwner(profile);
  if (!owner) return [];
  const rows = await fetchJson(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?type=owner&sort=updated&per_page=${Math.min(100, Math.max(1, limit))}`);
  if (!Array.isArray(rows)) return [];
  return rows.filter((repo) => repo && repo.full_name && !repo.fork && !repo.archived && !repo.disabled);
}

export async function syncGithubCatalog(catalog) {
  if (!catalog.github?.autoSync || !catalog.profile) return { ...catalog, githubSync: { enabled: false, added: 0 } };
  const rows = await fetchGithubRepos(catalog.profile, catalog.github.repoLimit);
  const existing = new Set(catalog.products.map((product) => product.repo.toLowerCase()));
  const excluded = new Set(catalog.github.exclude.map((repo) => repo.toLowerCase()));
  const additions = rows.filter((repo) => {
    const fullName = repo.full_name.toLowerCase();
    return !existing.has(fullName) && !excluded.has(fullName) && !excluded.has(repo.name.toLowerCase());
  }).map((repo) => ({
    id: `${repoKind(repo)}:${repo.full_name.toLowerCase()}`,
    repo: repo.full_name,
    kind: repoKind(repo),
    image: catalog.github.defaultImage,
    name: text(repo.name),
    description: text(repo.description),
    about: '',
    usage: '',
    features: [],
    website: safeWebUrl(repo.homepage),
    fallbackDescription: '',
    fallbackWebsite: '',
    remoteData: repo,
  }));
  return {
    ...catalog,
    products: [...catalog.products, ...additions],
    githubSync: { enabled: true, added: additions.length, total: rows.length },
  };
}
