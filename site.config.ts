import { defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
    
  url: 'https://www.alokiria.top/',
  lang: 'zh-CN',
  title: '愿慈悲永驻，愿你永远善良……',
  subtitle: '朋友，你知道东方Project吗？',
  author: {
    name: '江若水',
    avatar: 'https://raw.githubusercontent.com/Alokiria/Image-Hosting/refs/heads/Alokiria/Blog/avatar.png',
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

  sponsor: {
    enable: true,
    title: '我很可爱，请给我钱！',
    description: '钱钱，饿饿~',
    methods: [
      {
        name: '支付宝',
        url: 'https://raw.githubusercontent.com/Alokiria/Image-Hosting/refs/heads/Alokiria/Blog/alipay-qrcode.png',
        color: '#00A3EE',
        icon: 'i-ri-alipay-line',
      },
      {
        name: 'QQ 支付',
        url: 'https://raw.githubusercontent.com/Alokiria/Image-Hosting/refs/heads/Alokiria/Blog/QQpay-qrcode.png',
        color: '#12B7F5',
        icon: 'i-ri-qq-line',
      },
      {
        name: '微信支付',
        url: 'https://raw.githubusercontent.com/Alokiria/Image-Hosting/refs/heads/Alokiria/Blog/wechatpay-qrcode.png',
        color: '#2DC100',
        icon: 'i-ri-wechat-pay-line',
      },
    ],
    
  },
  
})
