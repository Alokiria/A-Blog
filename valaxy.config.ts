import type { UserThemeConfig } from 'valaxy-theme-yun'
import { defineValaxyConfig } from 'valaxy'
import { addonComponents } from 'valaxy-addon-components'
import { addonFace } from 'valaxy-addon-face'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'
import { tryOnBeforeMount } from '@vueuse/core'

// add icons what you will need
const safelist = [
    'i-ri-home-line',
]

/**
 * User Config
 */
export default defineValaxyConfig<UserThemeConfig>({
    // site config see site.config.ts
    theme: 'yun',

    themeConfig: {
        type: 'nimbo',
        banner: {
            enable: true,
            title: '向昨天挥手再见',
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
                url: '/gallery/',
                icon: 'i-ri-gallery-line',
                color: 'green',
            },
            {
                name: 'Pixiv',
                url: '/gallery/pixiv',
                icon: 'i-ri-sparkling-2-line',
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
    
    },
    addons: [
        addonComponents(),
        addonFace({
            defaultSize: '3.5em',
            path: 'https://github.com/Alokiria/Image-Hosting/tree/Alokiria/Blog/meme/'
        }),
    ],
    math: true,
    features: { katex: true },
    unocss: { safelist },


   markdown: {
    config(md) {
      md.use(groupIconMdPlugin)
    },
    
  },
  
  vite: {
    plugins: [
      groupIconVitePlugin()
    ],
  }

})