---
layout: default
title: Pixiv
icon: i-ri-bar-chart-2-line
nav: false
comment: false
---

<PixivRanking />

<!--
  排行榜走的是社区公开反代，无需任何 token / 后端。
  默认数据源见 composables/pixiv-ranking.ts 的 DEFAULT_SOURCES：
    1. hibiapi.cocomi.eu.org   （Pixiv App API 原始结构，支持翻页）
    2. cloud.mokeyjay.com      （经 d.cocomi.eu.org 转发，每日榜）
  可用 themeConfig.pixiv.ranking 覆盖数据源、榜单模式、图片代理链。

  ⚠️ 公共反代随时可能挂掉或限流（密集请求会 429），
  要长期稳定请自建反代后加到 sources 最前面。
-->
