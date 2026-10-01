<script lang="ts" setup>
import { computed } from 'vue'

/**
 * Post 顶部封面图。
 *
 * 为什么不用主题自带的 YunCover：
 *  1. **防盗链**：YunCover 生成的 <img> 没有 referrerpolicy，如果 cover 图存在
 *     语雀 cdn.nlark.com 这类配了 Referer 白名单的图床，浏览器会带上博客的
 *     Referer → 403 `denied by Referer ACL` → 图裂。这里固定加
 *     `referrerpolicy="no-referrer"` 解决。
 *     注意：正文里的图片是由 markdown 管线注入该属性的（见 valaxy.config.ts），
 *     封面图不走 markdown 管线，所以必须在这里单独处理。
 *  2. YunCover 硬编码了 width="640" height="360"，并带 UnoCSS 的 h="64 md:sm"
 *     固定高度，非 16:9 的图会被拉伸；这里交给 .yun-cover 的 CSS 控制尺寸。
 *
 * 支持三种写法：
 *   cover: https://xxx/a.jpg
 *   cover: { url: https://xxx/a.jpg, style: 'object-fit: contain' }
 *   cover: { url: https://xxx/a.jpg, referrerpolicy: 'origin' }   // 需要时覆盖默认
 *   cover: { url: https://xxx/a.jpg, alt: '示意图' }
 */
const props = defineProps<{ cover?: any }>()

/** 把 cover 归一化成图片地址（字符串或对象两种形式） */
const src = computed<string | undefined>(() => {
  const c = props.cover
  if (!c)
    return undefined
  if (typeof c === 'string')
    return c
  return c.url || c.src || undefined
})

/** 单张封面可选的额外控制 */
const opts = computed(() => {
  const c = props.cover
  return c && typeof c === 'object' ? c : {}
})

const style = computed(() => opts.value.style)
const alt = computed(() => opts.value.alt || '')
const referrerpolicy = computed(() => opts.value.referrerpolicy || 'no-referrer')
</script>

<template>
  <img
    v-if="src"
    class="yun-cover object-cover select-none"
    :src="src"
    :alt="alt"
    :style="style"
    :referrerpolicy="referrerpolicy"
    loading="lazy"
  >
</template>
