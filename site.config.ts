import { defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
    
  url: 'https://www.alokiria.top/',
  lang: 'zh-CN',
  title: '愿慈悲永驻，愿你永远善良……',
  subtitle: '朋友，你知道东方Project吗？',
  author: {
    name: '江若水',
    avatar: 'https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/o_251204051906_4.png',
    intro: 'An aspiring Technical Artist'
  },
  description: '井底之蛙虽不知大海的辽阔，但会知道天空的湛蓝。',
  social: [
    {
      name: 'RSS',
      link: '/feed.xml',
      icon: 'i-ri-rss-line',
      color: 'orange',
    },
    {
      name: 'GitHub',
      link: 'https://github.com/Alokiria',
      icon: 'i-ri-github-line',
      color: '#6e5494',
    },
    {
      name: '知乎',
      link: 'https://www.zhihu.com/people/alokiria',
      icon: 'i-ri-zhihu-line',
      color: '#0084FF',
    },
    {
      name: '哔哩哔哩',
      link: 'https://space.bilibili.com/316707795',
      icon: 'i-ri-bilibili-line',
      color: '#FF8EB3',
    },
    {
      name: 'Twitter',
      link: 'https://x.com/likwater34940',
      icon: 'i-ri-twitter-x-fill',
      color: 'black',
    },
    {
      name: 'Telegram Channel',
      link: 'https://t.me/karliaty',
      icon: 'i-ri-telegram-line',
      color: '#0088CC',
    },
    {
      name: 'E-Mail',
      link: 'mailto:jyh752038321@outlook.com',
      icon: 'i-ri-mail-line',
      color: '#8E71C1',
    },
    {
      name: 'Travelling',
      link: 'https://www.travellings.cn/go.html',
      icon: 'i-ri-train-line',
      color: 'var(--va-c-text)',
    },
  ],

  search: {
    enable: true,
  },

  /**
   * 评论系统总开关（具体实现见 valaxy.config.ts 的 addonWaline）。
   *
   * 这里只是「总闸」，某个页面到底显不显示评论区由两层共同决定：
   *   1. 本开关为 true；
   *   2. 该页 frontmatter 的 `comment` 不为 false
   *      （见 components/ValaxyMain.vue 的 `frontmatter.comment !== false`）。
   *
   * 当前只有这四类页面开着评论区：
   *   - 文章页    pages/posts/**           （frontmatter 不写 comment）
   *   - 画廊页    pages/albums/index.md    （显式 comment: true）
   *   - 角色页    pages/girls/index.md     （显式 comment: true）
   *   - 关于页    pages/about/index.md     （显式 comment: true）
   * 归档 / 分类 / 标签 / 友链 / 追番 / Pixiv / 关于站点等工具页
   * 都在各自 frontmatter 里显式写了 `comment: false`，想开哪一个把那一行
   * 删掉（或改成 true）即可，不用动这里的总开关。
   */
  comment: {
    enable: true,
  },

  /**
   * 首页每页文章数。
   *
   * 首页网格是「首行 2 张大卡 + 其余行每行 3 张小卡」，
   * 14 = 2 + 3 × 4，正好铺满 5 行、不留空位。
   */
  pageSize: 14,

  /**
   * 阅读统计：开启后 Valaxy 会在构建时给每篇文章 frontmatter 注入
   * `wordCount`（字数）与 `readingTime`（预估阅读分钟数），
   * 首页卡片底部右侧就是靠这两个字段显示的。
   */
  statistics: {
    enable: true,
  },

  sponsor: {
    enable: true,
    title: '我很可爱，请给我钱！',
    description: '钱钱，饿饿~',
    methods: [
      {
        name: '支付宝',
        url: 'https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/t_261001084813_alipay-qrcode.png',
        color: '#00A3EE',
        icon: 'i-ri-alipay-line',
      },
      {
        name: 'QQ 支付',
        url: 'https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/t_261001084814_QQpay-qrcode.png',
        color: '#12B7F5',
        icon: 'i-ri-qq-line',
      },
      {
        name: '微信支付',
        url: 'https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/t_261001084814_wechatpay-qrcode.png',
        color: '#2DC100',
        icon: 'i-ri-wechat-pay-line',
      },
    ],
    
  },
  
})
