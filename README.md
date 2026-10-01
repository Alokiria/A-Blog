# A-Blog

个人博客，基于 [Valaxy](https://valaxy.site) 1.0 + `valaxy-theme-yun`（nimbo 模式）。

站点：<https://www.alokiria.top/>

## 快速开始

```bash
# 安装依赖（需要 Node.js >= 22.12.0）
npm install

# 本地开发
npm run dev

# 生产构建（SSG 预渲染）
npm run build

# 本地预览构建产物
npm run serve
```

开发服务器默认地址见 `npm run dev` 的输出（本仓库示例使用 `--port 4321`）。

## 包管理器

**本项目只使用 npm，仓库里只保留 `package-lock.json`。**

原因：Valaxy 1.0 的 CLI（`node_modules/valaxy/bin/valaxy.mjs`）以及主题 / 插件在**运行期**用 Node 原生 ESM 解析去加载依赖（例如 `yargs`）。pnpm 默认的 isolated 链接模式不会把这些传递依赖暴露到根 `node_modules`，会直接报 `ERR_MODULE_NOT_FOUND`。

> **不要往仓库里加回 pnpm 的锁文件 / 配置。** Cloudflare Pages 等平台是**按锁文件自动识别包管理器**的：只要仓库里存在 `pnpm-lock.yaml`，构建时就会改成跑 `pnpm install --frozen-lockfile`，而这个锁文件一旦没跟上 `package.json` 的改动，构建会在安装依赖阶段直接失败（`ERR_PNPM_OUTDATED_LOCKFILE`）。
>
> 同理，`pnpm-workspace.yaml` 也会被识别为 pnpm 项目，故一并移除。

如果你本地确实想用 pnpm 跑一遍看看（不推荐），那就自己临时装，别把锁文件提交上来。注意 pnpm **11+** 不再从 `.npmrc` 读取 hoist 设置，而**不要**改用 `publicHoistPattern: ['*']` —— 那会把所有传递依赖强行提升到根目录，导致同名包多版本冲突（例如 `confbox` 0.2.x 遮蔽 `pkg-types` 需要的 0.3.x，`./json` 子路径直接解析失败）。

另外 `.npmrc` 里设置了 `legacy-peer-deps=true`：`valaxy-addon-bangumi` 等插件的 peer 声明是 `valaxy: ">=0.22"`，而 semver 默认不认为 `1.0.0-rc.16` 满足 `>=0.22`，npm 会直接 `ERESOLVE` 失败。

## 页面

| 路径 | 说明 |
| --- | --- |
| `/` | 主页，带开场动画（见下） |
| `/posts/` | 文章列表 |
| `/archives/` | 归档时间线 |
| `/categories/` | 分类。**点击分类后，下方会展开该分类下的时间线文档并自动滚动过去** |
| `/tags/` | 标签。**点击标签后，下方会展开该标签下的时间线文档并自动滚动过去** |
| `/pixiv/` | Pixiv 排行榜。日/周/月/新人/原创/男性向/女性向/AI 榜单，走公共反代，无需 token / 后端 |
| `/bangumi/` | 追番列表（Bilibili / Bangumi） |
| `/albums/` | 画廊索引（卡片墙），`/albums/<slug>` 是单个画廊的照片网格 + 灯箱 |
| `/links/` | 友链 |
| `/about/` | 关于 |

### 主页动画

主页开场动画由 `layouts/home.vue` + `components/prologue/YunPrologueSquare.vue` 实现，序列为：

1. Banner 逐字动画（主题 `YunBanner`）结束后置 `yun.bannerAnimationDone = true`
2. 头像外框方块从「旋转 135°、无圆角」收成「正圆、无旋转」
3. 头像外框触发 `LineBurstEffects` 线条爆发
4. 头像自身淡入
5. 作者名 / 简介 / 手绘分割线 / 站点标题副标题描述 / 社交图标 / 导航按钮依次淡入
6. 导航里的「文章」按钮不跳转路由，而是平滑滚动到文章列表

这段逻辑**刻意没有替换成主题 1.0 内置的 `YunPrologueSquare`**，因为内置版本改了动画表现（改成了 `visibility` + 逐项延迟的揭示动画）。

想换成主题默认外观：删掉 `components/prologue/YunPrologueSquare.vue`，并把 `layouts/home.vue` 里的 `YunPrologueSquare` 改为使用主题全局组件即可。

### Pixiv 排行榜

组件：`components/pixiv/PixivRanking.vue`，取数：`composables/pixiv-ranking.ts`，图片代理：`composables/pixiv-image.ts` + `components/pixiv/ProxyImage.vue`。

**不需要任何 token、OAuth 或后端**。原理是调用社区公开的反代服务，这也是 nanoka.top 等站点的做法。默认两个数据源，依次降级：

| 数据源 | 地址 | 特点 |
| --- | --- | --- |
| hibiapi | `hibiapi.cocomi.eu.org/api/pixiv/rank` | Pixiv App API 原始结构，支持翻页（每页 30），带翻译标签和 `meta_pages`（多页作品） |
| mokeyjay | `cloud.mokeyjay.com/pixiv`（经 `d.cocomi.eu.org` 转发） | 每日榜，一页 50 条，用他自己的图床，图片相对更稳 |

功能：日榜 / 周榜 / 月榜 / 新人 / 原创 / 男性向 / 女性向 / AI 八种榜单、日期选择、瀑布流与网格两种布局（记在 localStorage）、多页作品翻页、灯箱支持 `←` `→` 换作品、`↑` `↓` 换页、`Esc` 关闭。

几个已经踩过的坑，写在代码注释里了：

- **`date` 参数必须是 `YYYY-MM-DD`**，传 `20260929` 会 500。
- **公共反代有限流**：密集请求会返回 429。所以做了退避重试（429/5xx 自动重试）+ 当日结果缓存进 localStorage，同一天同一榜单不重复请求。
- **响应结构靠字段判断**，不是靠配置：`{ illusts: [...] }` 走 App API 解析，`{ data: [...], url: [...] }` 走扁平解析。
- **浏览器里不要给跨域请求设 `Referer`**：它是禁止修改的头，写了直接抛错。测试反代可用性请在 Node 里加。
- **图片不能直连 `i.pximg.net`**（防盗链，必然 403），要换成允许外链的代理域名。`ProxyImage` 会按候选链依次尝试，并把「哪个域名能通」记进 localStorage，下次优先用。

### 公共反代的真实限制（重要）

实测结论，避免踩坑：

| 数据源 | 浏览器可用 | 限制 |
| --- | --- | --- |
| `hibiapi` | ❌ | **Origin 域名白名单**只放行 `localhost`（任意端口）、它自己的前端域名和 `nanoka.top`。任何真实部署的站点都被 `400 Not Accepted` 拒绝——所以**本地开发正常、部署后必然降级** |
| `mokeyjay` | ✅ | 只有日榜、**无视 `date` 参数**（永远返回它缓存的那天）、无法翻页 |

> 这也解释了为什么参考站 `nanoka.top` 能用 `hibiapi` 而普通站点不能：它的域名在服务端白名单里。

### 想要完整能力只能自建反代

上面两条限制是服务端行为，前端改不动。想拿到 **8 种榜单 + 翻页 + 日期筛选 + 翻译标签**，只能自己部署一个反代（自己控制 CORS，不再受白名单限制），再写进 `sources` 最前面并声明 `prefer`：

```ts
themeConfig: {
  pixiv: {
    ranking: {
      sources: [
        {
          label: 'self-hosted',
          rankUrl: 'https://your-proxy.example.com/api/pixiv/rank?mode={mode}&page={page}&date={date}',
          // 声明它优先服务这 8 个榜单模式（不给 prefer 就按数组顺序）
          prefer: ['day', 'week', 'month', 'rookie', 'original', 'male', 'female', 'ai'],
        },
        // ...默认的公共反代会自动作为降级保留
      ],
      imageProxies: ['pximg.cocomi.eu.org', 'i.pixiv.re'],
      maxItems: 120,
    },
  },
}
```

> 本仓库曾经自带过两个反代实现（Cloudflare Worker 与 Vercel Serverless Function），因为出口 IP 被 Pixiv 封禁、维护成本高于收益，**均已弃置并移除**，不再提供部署脚本。

> 说明一个常见的误解：**Pixiv 没有「我的收藏」公开 API**。App API 只开放排行榜和指定用户的作品列表，所以「展示自己收藏的画师作品」只能靠手动维护数据，或爬 HTML（有风险）。这也是本站只做排行榜的原因。

### 画廊

`/albums/` 是一棵由 [`albums.ts`](albums.ts) 描述的画廊树，**只用这一个数据文件 + 一个页面**。
画廊之间的跳转是页面内状态（同时写进 URL query `?a=<id>`），所以：

- 嵌套多少层都不用新建文件
- 不需要动态路由，SSG 静态导出完全没问题
- 刷新 / 前进后退 / 分享带 query 的链接都能还原到同一个画廊

#### 一个节点带哪种数据，就渲染成哪种画廊

| 字段 | 渲染成 | 特点 |
| --- | --- | --- |
| `children` | 子画廊卡片墙 | **画廊里套画廊**，可无限嵌套；角标显示子画廊数量 |
| `cards` | 卡片图鉴 | 顶部**搜索框 + 标签筛选**，卡片下方写名字/附注，点开看大图 |
| `photos` | 普通画廊 | 纯图片瀑布流（图片下方**不显示**名字），点开看大图 |

`children` 优先级最高，所以一个节点可以同时是「分组」又带着自己的卡片/照片。

#### 加画廊

编辑 [`albums.ts`](albums.ts)，往对应位置插一项即可：

```ts
// 卡片图鉴
{
  id: 'my-cards',                    // 唯一 id，用于 ?a=my-cards
  cover: 'https://.../cover.jpg',    // 封面
  caption: '我的卡图',                // 卡片下方显示「我的卡图」
  desc: '鼠标悬停时的完整描述',
  badge: '120 张',                   // 可选；不写则自动按数据算
  cards: [
    {
      src: 'https://.../a.jpg',
      name: '卡 01',                 // 卡片下方显示
      meta: '2026/01/01 画师',       // 名字下方的小字，可选
      desc: '简介，点开大图后显示在图片下方', // 可选
      tags: ['PR', '角色A'],
    },
  ],
}

// 普通画廊（name 不显示在图下，只用于搜索、悬停提示和灯箱标题）
{
  id: 'my-photos',
  cover: '...',
  caption: '随手拍',
  photos: [
    {
      src: 'https://.../a.jpg',
      name: 'IMG_0001',
      desc: '简介，点开大图后显示在图片下方', // 可选
      tags: ['风景'],
    },
  ],
}

// 画廊分组（里面继续放上面两种，或再套分组）
{
  id: 'my-group',
  cover: '...',
  caption: '某游戏',
  children: [ /* ... */ ],
}
```

搜索会同时匹配 `name`、`meta`、`desc`、`tags`；`tags` 会自动汇总成筛选按钮（按出现次数排序，最多 24 个）。
图片加载失败会显示占位图标，不会留空白。灯箱支持 `←` `→` 翻页、`Esc` 关闭、点「查看原图」跳原图。
`desc`（简介）会显示在大图下方单独一行，支持换行与长文本自动折行；不写就不显示这一行。

#### 组件

| 文件 | 作用 |
| --- | --- |
| [AlbumBrowser.vue](components/album/AlbumBrowser.vue) | 按当前节点决定渲染哪种视图，管面包屑与返回 |
| [AlbumWall.vue](components/album/AlbumWall.vue) | 画廊卡片墙（紧凑缩略网格 + 搜索） |
| [CardGrid.vue](components/album/CardGrid.vue) | 卡片图鉴（搜索 + 标签筛选 + 灯箱） |
| [PhotoWall.vue](components/album/PhotoWall.vue) | 普通画廊（JS 分列瀑布流 + 名字 + 灯箱） |
| [album-nav.ts](composables/album-nav.ts) | 把「当前画廊」同步到 URL query |
| [album-view.ts](composables/album-view.ts) | 视图判定纯函数（便于单测） |

> 没有复用主题自带的 `YunAlbumList`：它是拍立得倾斜风格，和参考站那种干净网格不一样；
> 主题的 `gallery` 布局还依赖 `valaxy-addon-lightgallery` 插件（本站没装），所以照片展示是自带的组件。
> 也没有引入任何新依赖：瀑布流用 JS 按窗口宽度分列实现。

### 追番页

用官方插件 [`valaxy-addon-bangumi`](https://valaxy.site/zh/addons/official/bangumi)，它依赖 [`bilibili-bangumi-component`](https://github.com/yixiaojiu/bilibili-bangumi-component) 提供一个后端服务来转接 Bilibili / Bangumi 的公开接口。

`valaxy.config.ts` 顶部有三个常量需要按需修改：

```ts
const BANGUMI_API = 'https://yi_xiao_jiu-bangumi.web.val.run' // 后端地址
const BILIBILI_UID = '316707795'                              // Bilibili uid
const BANGUMI_UID = ''                                        // Bangumi uid，填了才会显示 Bangumi 标签页
```

> ⚠️ 默认的 `BANGUMI_API` 是插件作者的**公开演示后端**，随时可能挂掉。正式使用请自建后端（参考上面 `bilibili-bangumi-component` 的 `docs/backend.md`），然后替换该地址，并把 uid 改到后端的环境变量里。

## 目录结构

- `pages`：页面。`pages/posts` 下的文章会被计入文章列表
- `components`：自定义 Vue 组件，自动注册，也可在 Markdown 里直接用
  - `prologue/`：主页开场动画
  - `pixiv/`：`PixivRanking`（排行榜）、`ProxyImage`（图片代理链）、`pixiv-shared.scss`（样式）
  - `album/`：`AlbumBrowser`（视图分发 + 面包屑）、`AlbumWall`（卡片墙）、`CardGrid`（卡片图鉴）、`PhotoWall`（普通画廊）、`album-shared.scss`（样式）
  - 与主题同名的组件会**覆盖**主题组件
- `layouts`：自定义布局，在 Markdown frontmatter 里用 `layout: xxx` 指定
  - `categories.vue` / `tags.vue`：分类 / 标签（含点击后展开时间线）
- `composables`：取数与工具逻辑
  - `pixiv-ranking.ts`：排行榜多源降级、限流退避、缓存
  - `pixiv-image.ts`：图片代理候选链与成功率记忆
  - `album-nav.ts` / `album-view.ts`：画廊路由状态与视图判定
- `albums.ts`：画廊树数据（加画廊只改这里）
- `styles`：覆盖主题样式，`index.scss` / `vars.scss` / `index.css` 会自动加载
- `locales`：自定义 i18n
- `types`：项目类型定义（`pixiv.ts` 数据结构、`valaxy.d.ts` 配置类型扩展）
- `.github`：GitHub Actions，自动构建并部署到 GitHub Pages
- `netlify.toml` / `vercel.json` / `Dockerfile`：其他部署方式

## 部署

- **GitHub Pages**：推送到 `main` 分支后由 `.github/workflows/gh-pages.yml` 自动构建
- **Netlify**：见 `netlify.toml`
- **Vercel**：见 `vercel.json`
- **Docker**：
  ```bash
  docker build . -t a-blog:latest
  ```

所有部署环境的 Node.js 都必须是 **>= 22.12.0**（Valaxy 1.0 的硬性要求，由 Vite 8 与 `unplugin-vue-markdown@32` 共同决定）。Node 18 / 20 不再支持。
