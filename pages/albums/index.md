---
layout: default
title: 画廊
icon: i-ri-gallery-line
nav: false
comment: true
---

<AlbumBrowser />

<!--
  画廊数据全部来自项目根目录的 gallery/ 文件夹，一个画册一个文件夹，
  由 albums.ts 在构建时自动读取并拼成画廊树，这个页面不需要写别的。

  一个画册文件夹里可以放：
    album.ts    必须有：id / cover / caption / desc / order
    cards.ts    可选：卡片图鉴数据（带搜索框 + 标签筛选，卡片下方写名字）
    photos.ts   可选：普通画廊数据（纯图片网格，点开看大图）
    子文件夹     可选：里面的每个文件夹都是一个子画廊（画廊分组，可无限嵌套）

  详细说明和示例见 gallery/README.md。

  当前打开哪个画廊存在 URL query（?a=<id>），刷新和分享都能还原。
-->
