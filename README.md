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

### 评论（Waline）

用官方插件 [`valaxy-addon-waline`](https://valaxy.site/zh/addons/official/waline)。

Valaxy 这边只负责渲染评论区，评论的**存储 / 读取 / 管理全在服务端**，所以必须自己部署一个——Waline 官方不提供公共演示服务端，没有「不部署也能用」的选项。

`valaxy.config.ts` 顶部：

```ts
// 换成你自己部署好的 Waline 服务端地址，否则评论区能渲染出来但一直提示加载失败
const WALINE_SERVER_URL = 'https://a-b-waline.vercel.app'
```

部署流程见[官方快速上手](https://waline.js.org/guide/get-started/)：Vercel 一键部署 → 建数据库（Neon）→ 拿到 `https://xxx.vercel.app` 填进上面的常量 → 访问 `<地址>/ui/register` 注册管理员（**第一个注册的人自动成为管理员**）。

哪些页面显示评论区由两层共同决定：`site.config.ts` 的 `siteConfig.comment.enable`（总闸）+ 单页 frontmatter 的 `comment`（`comment: false` 单独关掉）。当前开启的是：文章页、`/albums/`、`/girls/`、`/about/`。

#### 邮件通知

想在有人评论 / 回复时收到邮件，靠的是**服务端的环境变量**（Vercel：`Settings` → `Environment Variables`），**改完必须 Redeploy 才生效**。

> ⚠️ 这些**不写进** `valaxy.config.ts`——前端读不到，写了也没用。

| 变量 | 填什么 |
| --- | --- |
| `SMTP_SERVICE` | 邮箱服务商名，见下方表格。与 `SMTP_HOST`+`SMTP_PORT` **二选一** |
| `SMTP_HOST` / `SMTP_PORT` | 服务商不在支持列表里时才填，邮箱的「设置」页能查到 |
| `SMTP_USER` | 发信邮箱的**完整地址**（也是默认的发件人） |
| `SMTP_PASS` | 登录密码；**163 / QQ 邮箱是单独的「授权码」**，不是登录密码 |
| `SMTP_SECURE` | 是否用 SSL。**只在走 `SMTP_HOST` / `SMTP_PORT` 时生效**——465 填 `true`，587 / 25 留空。**一旦写了 `SMTP_SERVICE`，这个变量会被完全忽略**（SSL 由服务商定义决定，不用你操心） |
| `SITE_NAME` | 站点名，显示在通知邮件里 |
| `SITE_URL` | 站点地址，显示在通知邮件里 |
| `AUTHOR_EMAIL` | 博主邮箱：新评论通知发到这里；同时用它区分「博主自己发的评论」，是本人发的就不再提醒。**不填的话博主通知发不出去** |

`SMTP_USER`（发信账号）和 `AUTHOR_EMAIL`（收信地址）**可以不是同一个**，比如用 QQ 邮箱发信、通知发到 Outlook。

以本站为例（把邮箱换成你自己的）：

```ini
SMTP_SERVICE=QQ
SMTP_USER=你的QQ号@qq.com
SMTP_PASS=QQ邮箱设置里生成的16位授权码
SITE_NAME=愿慈悲永驻，愿你永远善良……
SITE_URL=https://www.alokiria.top/
AUTHOR_EMAIL=你想收通知的邮箱
```

常用服务商名（[完整列表](https://github.com/nodemailer/nodemailer/blob/master/src/well-known/services.json)）：

| 邮箱 | `SMTP_SERVICE` |
| --- | --- |
| QQ 邮箱 | `QQ` |
| 腾讯企业邮 | `QQex` |
| 网易 163 / 126 | `163` / `126` |
| 阿里云个人邮箱 | `Aliyun` |
| 阿里云企业邮箱 | `AliyunQiye` 或 `qiye.aliyun` |
| 飞书邮箱 | `Feishu Mail` |
| Zoho | `Zoho` |
| Gmail | `Gmail` |
| Microsoft 365 | `Outlook365` |
| Outlook.com / Hotmail 个人邮箱 | `Hotmail` |

三个坑：

- **163 / QQ 必须用授权码**。163：设置 → POP3/SMTP/IMAP → 开启服务 → 新增授权密码；QQ：设置 → 账户 → POP3/IMAP/SMTP服务 → 开启 → 生成授权码。填登录密码会直接认证失败。
- **Outlook.com 个人邮箱**对 SMTP AUTH 限制越来越多（要开两步验证并用应用密码），不建议拿来当发信邮箱。
- **自定义域名的邮箱要先确认它真的能发信**。像 Cloudflare Email Routing 只做转发，**没有 SMTP 发信能力**，填了必然失败。

配好邮件服务后，Waline 的用户注册会额外走邮箱验证码流程（防恶意注册），这是预期行为，不是 bug。

#### 几个从服务端源码里确认的行为

看的是 `@waline/vercel` 的 `src/service/notify.js`，几条不看源码想不到的：

- **博主邮件是「兜底」渠道**：只有当微信 / QQ / Telegram / 企业微信 / PushPlus / Discord / 飞书**全都没配（或全都没发出去）**时，才会给 `AUTHOR_EMAIL` 发邮件。所以「邮件 + 任一其他渠道」同时配时，博主只会收到那个渠道的消息。
- **访客回复通知**是另一条路：回复会发给**被回复者**，但有三个前提——对方留了真实邮箱（第三方登录的假邮箱会被跳过）、不是自己回自己、被回复的人不是博主（博主由上面那条兜底逻辑负责）。评论处于待审核（`waiting`）状态时也不发。
- **`SENDER_NAME` 和 `SENDER_EMAIL` 要一起填**才生效；只填一个时发件人会退回成 `SMTP_USER`。
- 以上这些都是**服务端**行为，改不了，只能顺着它配。

可选变量：`SENDER_NAME`、`SENDER_EMAIL`（自定义发件人）、`MAIL_SUBJECT` / `MAIL_TEMPLATE`（给访客的回复通知）、`MAIL_SUBJECT_ADMIN` / `MAIL_TEMPLATE_ADMIN`（给博主的新评论通知）、`DISABLE_AUTHOR_NOTIFY=true`（关掉博主通知）。Vercel 环境变量有 4KB 上限，模板很长时别硬塞。

`AUTHOR_EMAIL` / `SITE_NAME` / `SITE_URL` 是**所有通知渠道共用**的。除了邮件，Waline 还支持 Telegram、QQ、微信、企业微信、飞书、Discord、PushPlus 等，各自有单独的 key，详见[评论通知文档](https://waline.js.org/guide/features/notification.html)。

#### 评论审核与反垃圾

同样是**服务端环境变量**（Vercel），改完要 Redeploy。

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `COMMENT_AUDIT` | 关 | 开启后新评论是 `waiting` 状态，必须在 `<服务端>/ui` 审核通过才显示 |
| `AKISMET_KEY` | **默认就是开着的**（用 Waline 内置的公共 key `70542d86693e`） | 反垃圾。被判为垃圾的评论 `status = 'spam'`，前台不显示 |

服务端源码 `src/controller/comment.js` 里这两件事的顺序是关键：

```js
data.status = this.config('audit') ? 'waiting' : 'approved';

if (data.status === 'approved') {
  const spam = await this.service('akismet', this.ctx.serverURL).check(data)
    .catch((err) => { console.log(err); }); // 出错就当没检出垃圾
  if (spam === true)
    data.status = 'spam';
}
```

两条推论：

- **开了审核就不会再跑 Akismet**（审核优先），评论必然停在 `waiting`。
- `COMMENT_AUDIT` 只要不设就是关的（配置里是 `COMMENT_AUDIT && !isFalse(COMMENT_AUDIT)`）。所以「评论显示要审核」通常是它被设成了 `true` / `1`。

**所以「评论发出去看不到」有两种完全不同的原因，先分清**：

1. 评论停在 `<服务端>/ui` 的**待审核**里 → 是 `COMMENT_AUDIT` 开着。
2. 评论直接进了**垃圾**（`spam`）→ 是 Akismet 用那个公共 key 把它判成了垃圾。这个更常见，因为它是**默认开启**的。

**想让评论直接显示出来**：

```ini
COMMENT_AUDIT=false
AKISMET_KEY=false
```

> ⚠️ `AKISMET_KEY=false` 是把反垃圾**整个关掉**，之后只剩 `COMMENT_AUDIT`、代码里配的 `forbiddenWords` 关键词过滤，以及后台手动删。想留着反垃圾就去 [akismet.com](https://akismet.com/) 申请一个自己的 key 填进来——Waline 内置那个公共 key 是所有人共用的，判断很不稳，还经常把正常评论误杀。
>
> 另外 Akismet 只认字符串 `false`（代码是 `key.toLowerCase() !== 'false'`），写 `false` / `FALSE` 都行，但**不能留空**——留空会回落到内置 key，等于没关。
>
> Akismet 出错时会**放行**（`.catch()` 吞掉错误，`spam` 为 `undefined`，评论保持 `approved`）。所以「关掉后还是看不到评论」就得往别处查了：`IPQPS`（默认同一 IP 60 秒内不能重复评论，这个会直接报错提示）、或者评论发到了另一条 path 上。

#### 表情包

配置位置是 `valaxy.config.ts` 里 `addonWaline({ ... })` 的 `types` / `emoji` / `cdn`（**前端配置**，和上面的邮件通知不是一回事）。

**默认就有 B 站 / QQ / 微博三套**，不用配。插件源码（`valaxy-addon-waline/utils/index.ts`）里的默认值是：

```ts
getEmojis(cdn = '//unpkg.com/', types = ['bilibili', 'qq', 'weibo'], emoji?)
```

所以「评论区没有表情包」基本不会是这个原因，先查 `@waline/emojis` 的 CDN 通不通。

**加/换官方表情包**用 `types`。注意它是**整体替换**而不是追加——想保留 QQ、微博就得一起写：

```ts
addonWaline({
  serverURL: WALINE_SERVER_URL,
  types: ['bilibili', 'bmoji', 'qq', 'weibo', 'tieba', 'alus', 'coolapk', 'soul-emoji', 'tw-emoji'],
})
```

可选值来自包目录（`@waline/emojis@1.4.0`）：`alus`、`bilibili`、`bmoji`（B站小黄脸）、`coolapk`（酷安）、`qq`、`soul-emoji`（元气骑士）、`tieba`、`weibo`、`tw-emoji`，以及 `tw` / `tw-body` / `tw-food` / `tw-natural` / `tw-object` / `tw-symbol` / `tw-people` / `tw-sport` / `tw-time` / `tw-travel` / `tw-weather` / `tw-flag` 这一套按分类拆开的 Twitter 表情。⚠️ 这些表情包 Waline 不含版权，自负风险。

**加自己的表情包**（自己的 meme 图）用 `emoji`，填预设目录地址：

```ts
addonWaline({
  serverURL: WALINE_SERVER_URL,
  // 目录地址不要带结尾斜杠——插件会自动补一个 `/`，
  // 写了会变成 `.../emoji//`，多数 CDN 能容忍但不保证。
  emoji: ['https://cdn.jsdelivr.net/gh/Alokiria/Image-Hosting@v1.0.0/emoji'],
})
```

自己那套表情包需要在同一个目录里放一个 `info.json`，图片按 `前缀_名字.后缀` 命名：

```
https://example.com/my-emoji/
  ├─ my_laugh.png
  ├─ my_cute.png
  ├─ my_rage.png
  └─ info.json
```

```json
{
  "name": "我的表情",
  "prefix": "my_",
  "type": "png",
  "icon": "cute",
  "items": ["laugh", "cute", "rage", "sob"]
}
```

- `prefix` / `type`：拼出文件名（`my_` + `laugh` + `.png`）。表情的 key 就是文件名去掉前缀后缀，**不同预设之间同名会撞车**，所以务必加自己的前缀。
- `items`：按你想要的顺序列，别忘了合并 `icon` 那个。
- `icon`：选项卡上显示的代表性表情。

托管建议用 GitHub 仓库 + jsDelivr，并且**一定要带 tag**（`@v1.0.0`）。否则以后你改了表情图，历史评论里引用的表情会跟着一起变/挂掉。国内 `cdn.jsdelivr.net` 被污染时可以换 `gcore.jsdelivr.net`。

**换官方表情包的 CDN**用 `cdn`（默认 `//unpkg.com/`，只影响 `types` 那几套，不影响 `emoji`）：

```ts
cdn: 'https://cdn.jsdelivr.net/npm/',
```

两个源码层面的限制：

- 插件的 `emoji` 选项**没法用 `emoji: false` 关掉表情**（`getEmojis` 里 `!false` 为真，照样返回 `types` 的默认三套）。真要全关得写 `types: []` + `emoji: []`。
- `cdn` 只拼官方那几套的地址；`emoji` 里给的地址是原样用的（只补一个结尾 `/`）。

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

> ⚠️ **不要绕过 `npm run build` / `npm run build:ssg` 直接跑 `valaxy build --ssg`。**
> 构建末尾还要执行 `scripts/decode-dist-paths.mjs`：因为路由 path 是百分号编码的
> （浏览器地址栏、vue-router 匹配都用这一套），SSG 落盘的文件名会带着 `%E5…`，
> 而托管平台会先把请求路径解一次码再找文件，中文目录的文章页就会 404。
> 这个脚本把 dist 里的文件名还原成原始中文（`dist/posts/Godot大学习/一些…html`），
> 链接和 sitemap 仍然保持编码形式。编码问题的完整来龙去脉见
> `valaxy.config.ts` 里 `vitePluginSingleEncodedRoutePath` 的注释。
