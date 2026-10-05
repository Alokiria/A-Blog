import type { Plugin } from 'vite'
import type { UserThemeConfig } from 'valaxy-theme-yun'
import { defineValaxyConfig } from 'valaxy'
import { addonBangumi } from 'valaxy-addon-bangumi'
import { addonComponents } from 'valaxy-addon-components'
import { addonFace } from 'valaxy-addon-face'
import { addonGirls } from 'valaxy-addon-girls'
import { addonWaline } from 'valaxy-addon-waline'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'

/**
 * 追番页后端地址。
 *
 * `valaxy-addon-bangumi` 依赖 bilibili-bangumi-component，必须有后端服务把
 * Bilibili / Bangumi 的公开接口转成 JSON。这里默认用的是插件作者提供的公开演示后端，
 * 它随时可能挂掉，正式使用请自建后端（见 README「追番页后端」一节）后替换此地址。
 */
const BANGUMI_API = 'https://yi_xiao_jiu-bangumi.web.val.run'

/** Bilibili UID（后端 env 中已配置时可留空字符串） */
const BILIBILI_UID = '316707795'

/** Bangumi UID（后端 env 中已配置时可留空字符串） */
const BANGUMI_UID = 'alokiria'

/**
 * Waline 评论服务端地址。
 *
 * ⚠️ 这是个占位符，必须换成**你自己部署**的 Waline 服务端地址，否则评论区
 * 能正常渲染出来、但会一直提示「评论加载失败」——因为请求打不到任何真实服务端。
 *
 * 为什么一定要自建：Valaxy 这边（valaxy-addon-waline）只负责在前端渲染
 * Waline 组件，评论的存储 / 读取 / 管理全部由这个服务端承担。Waline 官方
 * 没有提供公共演示服务端，所以没有「不部署也能用」的选项。
 *
 * 部署（官方文档 https://waline.js.org/guide/get-started/ ，免费方案约 5 分钟）：
 *   1. 用 Vercel 一键部署 Waline 服务端（仓库自带 vercel.json，也可直接部署本仓库）；
 *   2. 在 Vercel 里建一个数据库（Neon / Postgres 等），Waline 会靠环境变量自动识别；
 *   3. 部署完拿到的地址形如 https://xxx.vercel.app，粘到下面这一行；
 *   4. 访问 `<你的地址>/ui/register` 注册管理员，第一个注册的人自动成为管理员。
 *
 * 想绑自己的域名（例如 waline.alokiria.top）就改这一行即可，代码别处不用动。
 *
 * 邮件通知等后续配置不在这里：那些是**服务端的环境变量**，前端读不到。
 * 填法见 README「评论（Waline）→ 邮件通知」一节。
 */
const WALINE_SERVER_URL = 'https://a-b-waline.vercel.app'

// add icons what you will need
const safelist = [
  'i-ri-home-line',
]

/**
 * 给所有 markdown 图片注入 `referrerpolicy="no-referrer"`。
 *
 * 语雀的图床（cdn.nlark.com，阿里云 Tengine）配了 Referer 白名单：只放行
 * `yuque.com` / `nlark.com` 自家域名和不带 Referer 的请求，其它来源一律
 * 403 `denied by Referer ACL`。浏览器渲染本站时默认会把页面地址作为 Referer
 * 发出去，于是文章里的语雀图片全部裂开。
 *
 * 这里走 core ruler 直接改 image token 的 attrs，而不是覆盖
 * `md.renderer.rules.image`——因为 Valaxy 在用户 config 之前就 `md.use()`
 * 了 markdown-it-image-figures（它会把 image renderer 包一层），改 token 才能
 * 同时覆盖 figure 输出和默认 renderer。
 */
function mdPluginImageNoReferrer(md: any) {
  md.core.ruler.push('image_no_referrer', (state: any) => {
    for (const token of state.tokens) {
      if (token.type !== 'inline')
        continue
      for (const child of token.children ?? []) {
        if (child.type !== 'image')
          continue
        // 尊重用户手写的 referrerpolicy，不覆盖
        if (child.attrGet('referrerpolicy') != null)
          continue
        child.attrPush(['referrerpolicy', 'no-referrer'])
      }
    }
  })
}

/**
 * 让文章路由 path 保持「恰好一层」百分号编码。
 *
 * ── 为什么需要这个插件 ────────────────────────────────────────────────
 *
 * `vue-router/unplugin` 生成路由时**已经**对每个路径段做过一次百分号编码
 * （unplugin 里的 `parseFileSegment` → `encodePath`），而 Valaxy 的
 * `client/main.ts` 里还有一段号称「fix chinese path」的补丁，又对顶层路由的
 * 直接子路由执行了一次 `encodeURI(j.path)`。两下一叠加，中文**目录段被编码了
 * 两次**（`%E5` → `%25E5`），叶子文件名只有一次：
 *
 *   /posts/Godot%25E5%25A4%25A7%25E5%25AD%25A6%25E4%25B9%25A0/%E4%B8%80%E4%BA%9BGodot%E6%8F%92%E4%BB%B6%E6%8E%A8%E8%8D%90
 *
 * 由此带来三个问题：
 *   1. 站内搜索（fuse 索引是从文件系统路径**只编码一次**生成的）里的链接
 *      匹配不到任何路由 → 点搜索结果只会落到兜底的 `[...path]` 404 页；
 *   2. 地址栏里的 URL 变成 `%25E5…` 这种「十六进制」样子，sitemap/RSS 同理；
 *   3. SSG 是用路由 path 当输出文件名的，于是 dist 里落盘的是
 *      `Godot%25E5…/一些….html` 这种名字；而托管平台（Vercel / Cloudflare Pages
 *      等）会先把请求路径解一次码再去找文件，永远找不到 → 文章页 HTTP 状态
 *      404，只是靠 SPA 在 404 页壳子里把文章渲染出来，看起来「能打开」。
 *
 * Valaxy 那次补丁在当下已经是多余的（unplugin 早就编码过一次了），所以这个插件
 * 把它替换成「保证每个 path 恰好一层编码」的版本：已经编码过的原样不动，
 * 万一哪天变成原始中文就编码一次。改的是 Valaxy 的源码文本，因此在
 * `transform` 里做（`enforce: 'pre'`，确保在 TS 转译之前拿到源码）。
 *
 * ⚠️ 这里**不能**顺手把 path 还原成原始中文：浏览器上报的 `location.pathname`
 * 是百分号编码过的，而 vue-router 是拿它跟 `route.path` 直接做字符串比较的
 * （`vue-router` 的 `tokenizePath` 不做解码）。实测：原始中文的 route path、
 * 以及双层编码的 route path 都匹配不到浏览器地址，只有单层编码对得上。
 * 磁盘文件名那一半的中文还原，交给 `scripts/decode-dist-paths.mjs` 在构建末尾做。
 *
 * 想撤掉这个 workaround，只能等 Valaxy 自己修掉 `client/main.ts` 里那段。
 */
function vitePluginSingleEncodedRoutePath(): Plugin {
  const valaxyHack = /\n\/\/ fix chinese path[\s\S]*?\n\}\)\n/
  /**
   * 按**内容**认文件，而不是按 id：dev 下这个模块的 id 带 query / 走别名，
   * 用 `endsWith('valaxy/client/main.ts')` 认不出来（构建时 id 是干净的路径，
   * 所以只在 dev 失效）。这段源码文本只可能出现在 Valaxy 的 main.ts 里。
   */
  const isValaxyClientMain = (code: string) => code.includes('// fix chinese path') && code.includes('encodeURI(j.path)')
  const replacement = `
// [A-Blog] 见 valaxy.config.ts 的 vitePluginSingleEncodedRoutePath：
// 保证每个路由 path 恰好一层百分号编码（原样保留 unplugin 的编码结果）
const fixRoutePath = (value: string) => {
  try {
    return decodeURI(value) === value ? encodeURI(value) : value
  }
  catch {
    return value
  }
}
const fixRoutePaths = (list: any[]) => {
  for (const route of list || []) {
    if (route && typeof route.path === 'string')
      route.path = fixRoutePath(route.path)
    if (route && Array.isArray(route.children))
      fixRoutePaths(route.children)
  }
}
fixRoutePaths(routes)
`
  return {
    name: 'a-blog:single-encoded-route-path',
    enforce: 'pre',
    transform(code) {
      if (!isValaxyClientMain(code))
        return
      if (!valaxyHack.test(code)) {
        this.warn('[A-Blog] 找到了 Valaxy 的「fix chinese path」补丁，但没能按预期替换掉它（代码结构变了？）。若中文路由出现双层编码（%25E5…），需要同步更新 vitePluginSingleEncodedRoutePath。')
        return
      }
      return code.replace(valaxyHack, replacement)
    },
  }
}

/**
 * User Config
 */
export default defineValaxyConfig<UserThemeConfig>({
  // site config see site.config.ts
  theme: 'yun',

  themeConfig: {
    type: 'nimbo',

    /**
     * 目录（右侧「本页」）读取的标题层级范围。
     *
     * Valaxy 里 getHeaders() 的默认 range 是 [2, 4]，**故意排除 h1**，
     * 所以 markdown 的 `#` 一级标题原本不会出现在目录里。
     * 这里显式写成 [1, 4]，把 h1 也纳入目录。
     *
     * 注意：不要图省事写 'deep' —— resolveHeaders 会把 'deep' 展开成 [2, 6]，
     * 同样不含 h1。
     */
    outline: [1, 4],

    banner: {
      enable: true,
      title: '向昨天挥手再见',
      // 主页背景网格装饰：关闭以保持原有视觉
      grid: {
        enable: false,
      },
    },
    /**
     * 侧边栏「自定义导航链接」入口（由主题的 YunSidebarLinks 渲染，
     * 手机端全屏菜单里的 YunSidebarLinks 也是同一份数据）。
     *
     * 数组顺序就是显示顺序：排在前面的显示在左边。
     * 所以「角色」放在 番剧 前面 = 入口出现在追番入口的左边。
     */
    pages: [
      {
        name: '角色',
        url: '/girls/',
        icon: 'i-ri-women-line',
        color: '#e0459b',
      },
      {
        name: '番剧',
        url: '/bangumi/',
        icon: 'i-ri-tv-line',
        color: 'pink',
      },
      {
        name: '画廊',
        url: '/albums/',
        icon: 'i-ri-gallery-line',
        color: 'green',
      },
      {
        name: 'Pixiv',
        url: '/pixiv/',
        icon: 'i-ri-bar-chart-2-line',
        color: 'blue',
      },
    ],
    footer: {
      since: 2026,
      beian: {
        enable: false,
        icp: '苏ICP备17038157号',
        police: '苏公网安备xxxxxx号',
      },
    },

    /**
     * Pixiv 排行榜配置（服务于 /pixiv/）。
     *
     * 走社区公开反代，无需任何 token 或后端。
     * 默认数据源与代理链见 composables/pixiv-ranking.ts；
     * 公共反代随时可能挂或限流，想长期稳定就自建反代后加到 sources 最前面。
     */
    pixiv: {
      ranking: {
        /*
         * 数据源按顺序降级，默认用 composables/pixiv-ranking.ts 里的两个社区公共反代。
         *
         * 实测结论（避免踩坑）：
         *
         *   hibiapi   只放行 localhost 和它自己的前端域名 + nanoka.top，
         *             任何真实部署的站点都会被 400 Not Accepted 拒绝
         *             （它的 Origin 白名单不含 alokiria.top）。
         *             所以部署后只能靠 mokeyjay。
         *   mokeyjay  浏览器可用，但只有日榜、无视 date 参数、无法翻页。
         *
         * 想拿到「8 种榜单 + 翻页 + 日期筛选」的完整能力，只能自建反代
         * （自己的域名自己控制 CORS），再写成下面的 sources 数组放到最前面，
         * 并用 prefer 声明它优先服务哪些榜单模式。
         */
        // sources: [
        //   {
        //     label: 'self-hosted',
        //     rankUrl: 'https://your-proxy.example.com/api/pixiv/rank?mode={mode}&page={page}&date={date}',
        //     prefer: ['day', 'week', 'month', 'rookie', 'original', 'male', 'female', 'ai'],
        //   },
        // ],
        imageProxies: ['pximg.cocomi.eu.org', 'i.pixiv.re'],
        maxItems: 120,
      },
    },
  },

  addons: [
    addonComponents(),
    addonFace({
      defaultSize: '3.5em',
      path: 'https://github.com/Alokiria/Image-Hosting/tree/Alokiria/Blog/meme/',
    }),
    addonBangumi({
      api: BANGUMI_API,
      bilibiliUid: BILIBILI_UID,
      bgmUid: BANGUMI_UID || undefined,
      bilibiliEnabled: true,
      bgmEnabled: Boolean(BANGUMI_UID),
      pageSize: 15,
      // Shadow DOM 内外样式隔离，只能通过 customCss 覆盖内部样式
      customCss: `
        .bbc-bangumi-title a { color: var(--va-c-primary); }
      `,
    }),

    /**
     * 角色画廊（valaxy-addon-girls）。
     *
     * 插件没有需要配置的选项，注册之后页面里就能直接用自动注册的
     * <ValaxyGirls> 组件了；角色数据写在 pages/girls/index.md 的
     * frontmatter `girls` 里（内联数组或远程 JSON 地址都行）。
     *
     * 注意：valaxy-theme-yun 本身也依赖这个包（它的 YunGirls.vue 是
     * 指向 ValaxyGirls 的废弃包装），但那是主题的内部依赖，项目要直接用
     * 就得像这里一样显式注册 + 在 package.json 里声明依赖。
     */
    addonGirls(),

    /**
     * 评论系统（Waline）。
     *
     * 总开关在 site.config.ts 的 `siteConfig.comment.enable`；
     * 单个页面用 frontmatter 的 `comment: false` 单独关掉。
     * 当前开启的页面：文章页、画廊页 /albums/、角色页 /girls/、关于页 /about/。
     *
     * 这里只传 serverURL，其余全部走 Waline 默认值。可以按需追加：
     *   - pageview: true   页面浏览量统计（配合 waline 的 /ui 后台看）
     *   - comment: true    在指定元素里渲染评论数
     *   - dark: 'html.dark'  暗色模式选择器（插件默认已按 Valaxy 的
     *                        appStore.isDark 自动切换，通常不用手写）
     *   - search: false / pageSize: 10 / requiredMeta: ['nick', 'mail'] 等
     */
    addonWaline({
      serverURL: WALINE_SERVER_URL,

      /**
       * 表情包。两个选项分工不一样：
       *
       * `types` —— 从官方表情包 @waline/emojis 里挑几套。插件会把每个值拼成
       *   `{cdn}@waline/emojis/{type}/`。**不写时默认就是 B 站 / QQ / 微博三套**，
       *   所以「评论区没有表情包」一般不是这里的问题。
       *   ⚠️ 一旦写了，就是**整体替换**默认值 —— 想留着 QQ、微博必须一起写进去。
       *   当前可选：
       *     alus（阿鲁斯）· bilibili（B站）· bmoji（B站小黄脸）· coolapk（酷安）
       *     qq · soul-emoji（元气骑士）· tieba（贴吧）· weibo（微博）
       *     tw-emoji（Twitter 表情）· tw / tw-body / tw-food / tw-people …（按分类）
       *
       * `emoji` —— 加**自己的**表情包（不在官方列表里的），填预设目录地址。
       *   插件会自动在末尾补一个 `/`，所以这里**不要写结尾斜杠**。
       *   那个目录里必须有一个 info.json，格式和托管方式见
       *   README「评论（Waline）→ 表情包」。
       *
       * `cdn` —— 只影响官方那几套的来源（默认 `//unpkg.com/`）。
       *   国内 unpkg 偶尔不稳，可以换成 `https://cdn.jsdelivr.net/npm/`。
       */
      // types: ['bilibili', 'bmoji', 'qq', 'weibo', 'tieba', 'alus', 'coolapk', 'soul-emoji', 'tw-emoji'],
      // emoji: ['https://cdn.jsdelivr.net/gh/<用户名>/<仓库>@<tag>/<表情包目录>'],
      types: ['bilibili', 'bmoji', 'qq', 'weibo', 'tieba', 'alus', 'coolapk', 'soul-emoji', 'tw-emoji'],
    }),
  ],

  math: true,
  features: { katex: true },
  unocss: { safelist },

  markdown: {
    /**
     * 图片说明文字（figcaption）。
     *
     * Valaxy 内部注册 markdown-it-image-figures 时用的默认值是
     * `figcaption: true`，而这个插件在 `true` 时的行为是
     * **只从 title 属性取文字**（即 `![alt](url "title")` 里的 title）。
     * 文章里的图片通常只写了 alt（`![环境光设置](url)`），没有 title，
     * 于是取不到文字 → 完全不生成 <figcaption>。
     *
     * 改成 `'alt'` 后，插件会把 alt 文字渲染成 <figcaption>；
     * alt 为空的图片（`![](url)`）会自动跳过，不会产生空说明。
     */
    imageFigures: {
      figcaption: 'alt',
    },

    config(md) {
      md.use(groupIconMdPlugin)
      // 让语雀等启用 Referer 防盗链的图床能正常加载，详见函数注释
      md.use(mdPluginImageNoReferrer)
    },
  },

  vite: {
    plugins: [
      vitePluginSingleEncodedRoutePath(),
      groupIconVitePlugin(),
    ],

    server: {
      watch: {
        /**
         * 用轮询代替原生文件监听。
         *
         * 某些编辑器/工具是「原子替换」保存文件（先写临时文件再 rename），
         * 在 Windows 上会让 chokidar 丢掉原来的文件句柄，改动因此不触发 HMR，
         * 表现为「代码改了但页面还是旧的」，只能重启开发服务器。
         * 轮询虽然多一点点 CPU 开销，但能稳定拿到变更。
         */
        usePolling: true,
        interval: 300,
      },
    },
  },
})
