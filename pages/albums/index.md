---
layout: default
title: 画廊
icon: i-ri-gallery-line
nav: false
comment: true
---

<AlbumBrowser />

<!--
  画廊数据全部来自项目根目录的 albums.ts，这个页面不需要写别的。

  albums.ts 里一个节点带哪种数据，决定它渲染成什么样：
    children  子画廊卡片墙（画廊里套画廊，可无限嵌套）
    cards     卡片图鉴（搜索框 + 标签筛选，卡片下方写名字）
    photos    普通画廊（图片网格，图片下方写名字，点开看大图）

  当前打开哪个画廊存在 URL query（?a=<id>），刷新和分享都能还原。
-->
