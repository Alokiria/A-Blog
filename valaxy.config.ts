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
 */
const WALINE_SERVER_URL = 'https://your-waline-url'

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
