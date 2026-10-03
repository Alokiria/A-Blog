<script lang="ts" setup>
/**
 * AppLink 覆盖版：站内链接先按「明文路径」对一遍路由表，再交给 RouterLink。
 *
 * ── 它挡的是什么 ──────────────────────────────────────────────────────
 *
 * Valaxy 的 fuse 站内搜索索引是从**文件系统路径**单独生成的
 * （`generateFuseList()` 里只有一次 `encodeURI`），链路里任何一处编码层数
 * 不一致，搜索结果的链接就会匹配不到路由、点下去落到兜底的 `[...path]` 404 页。
 *
 * 根因（unplugin 编码一次 + Valaxy `client/main.ts` 又编码一次造成的双层编码）
 * 已经在 `valaxy.config.ts` 的 `vitePluginSingleEncodedRoutePath` 里修掉了，
 * 现在索引里的链接和路由 path 是一致的。这里保留一层保险：
 * 无论上游给的是单层编码、双层编码还是直接写中文（例如 markdown 里手写的中文
 * 站内链接），都按明文对上路由表，换成该路由真实的 path。
 *
 * 代价很小：链接本来就匹配路由时走一次全等比较的快路径，不做任何改动；
 * 对不上任何路由时原样返回，交给 vue-router 按原有逻辑处理。
 *
 * 注意：文件本体是从 `node_modules/valaxy/client/components/AppLink.vue`
 * 复制过来的，只多了 link 的纠偏。Valaxy 升级后如果这个组件有新属性/新行为，
 * 需要把改动同步回来。
 */
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { resolveRoutePath } from '../composables/route-link'
import { EXTERNAL_URL_RE } from '../node_modules/valaxy/shared'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  showExternalIcon?: boolean
  to?: string
  href?: string
  target?: string
}>()

const router = useRouter()

/** 外链 / 锚点不参与纠偏，其余交给 resolveRoutePath() */
function resolveLink(raw: string) {
  if (!raw || raw.startsWith('#') || EXTERNAL_URL_RE.test(raw))
    return raw
  return resolveRoutePath(router.getRoutes().map(route => route.path), raw)
}

const link = computed(() => resolveLink(props.href || props.to || '#'))

const isExternalLink = computed(() => {
  return (link.value && EXTERNAL_URL_RE.test(link.value)) || props.target === '_blank'
})
</script>

<template>
  <a
    v-if="isExternalLink" class="va-link" v-bind="$attrs" :href="link"
    :target="target ?? (isExternalLink ? '_blank' : undefined)"
  >
    <slot />
    <div v-if="showExternalIcon" class="icon-link inline-block" i-ri-arrow-right-up-line />
  </a>
  <RouterLink v-else class="va-link" v-bind="$attrs" :to="link">
    <slot />
  </RouterLink>
</template>

<style>
.va-link {
  cursor: pointer;
}
</style>
