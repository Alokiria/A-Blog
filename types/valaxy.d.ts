/// <reference types="valaxy/types" />

import type { PixivRankingConfig } from './pixiv'

/**
 * Valaxy 主题配置的类型扩展。
 *
 * Valaxy 的站点/主题配置类型是 `DefaultTheme.Config` 命名空间，
 * 可以在用户项目里通过 declare module 增补字段，`useThemeConfig()` 就能拿到类型提示。
 */
declare module 'valaxy/types' {
  // eslint-disable-next-line ts/no-namespace
  export namespace DefaultTheme {
    export interface Config {
      /**
       * Pixiv 排行榜配置（服务于 `/pixiv/`）。
       *
       * 走社区公开反代，无需任何 token 或后端。
       * 默认数据源、榜单模式与图片代理链见 `composables/pixiv-ranking.ts`。
       */
      pixiv?: {
        ranking?: PixivRankingConfig
      }
    }
  }
}

export {}
