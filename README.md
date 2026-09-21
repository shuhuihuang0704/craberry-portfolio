# 蟹黄堡 · 个人网站

一个简单、清爽、有 3D 插画的个人网站。首页分为 Skill 和 App 产品菜单，每个产品链接到独立详情页，并提供 GitHub 与在线体验入口。

## 本地预览

```bash
npm run dev
```

然后打开 <http://localhost:4173>。

## 页面结构

- `index.html`：页面内容与语义结构
- `styles.css`：视觉系统、响应式布局与 CSS 动效
- `script.js`：产品菜单、详情页渲染、移动导航和轻量指针动效
- `product.html?id=产品ID`：可直接分享的产品详情页
- `catalog.mjs`：配置校验、GitHub 信息读取和离线备用内容
- `site.config.json`：配置需要接入的公开 GitHub 仓库
- `assets/craburger-3d.png`：原创 3D 蟹堡主视觉

## 接入 GitHub 仓库

编辑 `site.config.json`，填写公开仓库的 `owner/repo` 或 GitHub URL：

```json
{
  "github": { "profile": "https://github.com/your-name" },
  "products": [
    {
      "id": "my-skill",
      "repo": "your-name/your-repo",
      "kind": "skill",
      "fallback": { "description": "网络不可用时显示的产品简介" }
    }
  ]
}
```

`kind` 可填 `skill` 或 `app`。保持 `id` 稳定，避免已有详情页分享链接失效。当前选中了 shuhuihuang0704 的六个 App / 网站仓库，未添加名为 `-` 的仓库。

页面每次打开时会读取 GitHub 的仓库名称、简介、首页地址和最近推送时间。`fallback.description`、`fallback.website` 是网络失败时的备用数据，不覆盖在线信息。可选字段 `name`、`description`、`website` 则用于手动覆盖；`about`、`features`、`usage` 用于补充详情页。

此同步只更新仓库元数据，不自动拉取 README 正文、添加新仓库或重新部署产品代码。公开仓库不需要 Token；私有仓库需要安全后端，不应把 Token 写进前端。

运行 `npm test` 检查六个项目配置、独立路由、备用数据和链接安全性。
