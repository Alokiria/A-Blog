import { defineSiteConfig } from 'valaxy'

export default defineSiteConfig({
  url: 'https://www.alokiria.top/',
  lang: 'zh-CN',
  title: '愿慈悲永驻，愿你永远善良……',
  author: {
    name: '江若水',
  },
  description: '井底之蛙虽不知大海的辽阔，但会知道天空的湛蓝。',
  social: [
    {
      name: 'RSS',
      link: '/atom.xml',
      icon: 'i-ri-rss-line',
      color: 'orange',
    },
    {
      name: 'QQ 1304223172',
      link: 'https://qm.qq.com/q/lwQWHzfMFW',
      icon: 'i-ri-qq-line',
      color: '#12B7F5',
    },
    {
      name: 'GitHub',
      link: 'https://github.com/Alokiria',
      icon: 'i-ri-github-line',
      color: '#6e5494',
    },
    {
      name: '微博',
      link: 'https://weibo.com/u/7795048807',
      icon: 'i-ri-weibo-line',
      color: '#E6162D',
    },
    {
      name: '豆瓣',
      link: 'https://www.douban.com/people/',
      icon: 'i-ri-douban-line',
      color: '#007722',
    },
    {
      name: '网易云音乐',
      link: 'https://music.163.com/#/user/home?id=1605449409',
      icon: 'i-ri-netease-cloud-music-line',
      color: '#C20C0C',
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
      name: '微信公众号',
      link: '',
      icon: 'i-ri-wechat-2-line',
      color: '#1AAD19',
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
      link: 'jyh752038321@outlook.com',
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
    methods: [
      {
        name: '支付宝',
        url: 'https://raw.githubusercontent.com/Alokiria/Image-Hosting/refs/heads/Alokiria/Blog/alipay-qrcode.jpg',
        color: '#00A3EE',
        icon: 'i-ri-alipay-line',
      },
      {
        name: 'QQ 支付',
        url: 'https://raw.githubusercontent.com/Alokiria/Image-Hosting/refs/heads/Alokiria/Blog/qqpay-qrcode.png',
        color: '#12B7F5',
        icon: 'i-ri-qq-line',
      },
      {
        name: '微信支付',
        url: 'https://raw.githubusercontent.com/Alokiria/Image-Hosting/refs/heads/Alokiria/Blog/wechatpay-qrcode.jpg',
        color: '#2DC100',
        icon: 'i-ri-wechat-pay-line',
      },
    ],
  },
})
