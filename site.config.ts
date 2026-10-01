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
