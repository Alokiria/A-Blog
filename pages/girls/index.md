---
layout: default
title: 心动角色名册
icon: i-ri-women-line
nav: false
comment: true

# ---------------------------------------------------------------------------
# 角色数据（valaxy-addon-girls）
#
# 字段（只有 name 必填，其余都是可选元数据，写了就会原样保留）：
#   name    角色名
#   avatar  头像地址。不写时会依次回退到 anilist / 立绘
#   from    出自的作品
#   reason  喜欢的原因 —— 默认不显示，显示方式由下面的 reason-mode 决定
#
# 也可以不写内联数组，直接读远程 JSON：把整段 girls 删掉，换成一行地址即可
#   girls: https://example.com/girls.json
#
# ⚠️ 下面是 Valaxy 官方示例里的数据，用来保证页面开箱就有东西看。
#    换成你自己喜欢的角色吧（第一行 C.C. 那条顺便演示了 reason 怎么写）。
# ---------------------------------------------------------------------------
girls:
  - name: C.C.
    from: CODE GEASS
    reason: 冷静、神秘，又有自己的温柔。
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/b1111-hNdvOW5ZNCCH.png
  - name: 黑雪姬
    from: 加速世界
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/b46305-CiZOEqz5u1mk.png
  - name: 仓岛千百合
    from: 加速世界
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/b49635-lDQ1nWr4gBRX.png
  - name: 筒隐月子
    from: 变态王子与不笑猫
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/n42469-shq7IzxyJNbJ.jpg
  - name: 小豆梓
    from: 变态王子与不笑猫
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/52819.jpg
  - name: 明石
    from: 四叠半神话大系
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/b31522-Nkfqv7px3MAv.png
  - name: 松前绪花
    from: 花开伊吕波
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/b36184-ylcMtZPMm1cB.png
  - name: 阿库娅
    from: 为美好的世界献上祝福！
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/b89362-ibkc0eoECaW1.png
  - name: 惠惠
    from: 为美好的世界献上祝福！
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/b89361-tq8PQQ4MmF0M.png
  - name: 满舰饰真子
    from: KILL la KILL
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/b87511-T8lwlQKd6SoK.png
  - name: 北白川玉子
    from: 玉子市场
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/b74850-D8ksLbb9p9cw.png
  - name: 赫萝
    from: 狼与香辛料
    avatar: https://s4.anilist.co/file/anilistcdn/character/medium/b7373-1BH0gELuZmHD.jpg

# 加载后随机打乱顺序
random: false
---

<!--
  <ValaxyGirls> 由 valaxy-addon-girls 自动注册（已在 valaxy.config.ts 里 addonGirls()）。

  常用 props（完整列表见 https://valaxy.site/zh/addons/girls）：
    layout        'bubbles' | 'grid' | 'orbit'，默认 grid
    switchable    允许访客自己切换这三种布局
    reason-mode   'hidden'（默认）| 'inline' | 'hover'，控制 reason 备注的显示
    random        加载后随机排序
    initial-count / batch-size / render-mode
                  角色很多（100+）时的渐进渲染参数，默认首批 24 个、滚动追加

  还想加个标题或「共 N 位」的统计，用 header 插槽：
    <template #header="{ count, isLoading }">…</template>
  这里没写，因为页面标题已经说明了这是什么，再加会重复。
-->
<ValaxyGirls
  :girls="frontmatter.girls"
  :random="frontmatter.random"
  layout="bubbles"
  switchable
  reason-mode="hover"
/>
