import type { UserThemeConfig } from 'valaxy-theme-yun'
import { defineValaxyConfig } from 'valaxy'
import { addonBangumi } from 'valaxy-addon-bangumi'
import { addonComponents } from 'valaxy-addon-components'
import { addonFace } from 'valaxy-addon-face'
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
    pages: [
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
        // 想加自建反代就写在这里（会优先于默认的公共反代）
        // sources: [
        //   {
        //     label: 'self-hosted',
        //     rankUrl: 'https://your-worker.example.com/pixiv/rank?mode={mode}&page={page}&date={date}',
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
