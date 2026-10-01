<script setup lang="ts">
import { useFrontmatter } from 'valaxy'
import { computed } from 'vue'

const fm = useFrontmatter()

/**
 * frontmatter.sidebar 显式设为 false 时不渲染；否则由下面的 CSS 断点控制显隐。
 */
const sidebarExplicit = computed(() => {
  if (typeof fm.value.sidebar !== 'undefined')
    return fm.value.sidebar
  return undefined
})
</script>

<template>
  <div v-if="sidebarExplicit !== false" class="yun-layout-left">
    <slot>
      <YunSidebarCard />
      <YunAdBoard />
    </slot>
  </div>
</template>

<style>
/*
 * 左侧栏定位与主题右侧栏（components/YunAside.vue 的 .yun-aside）保持一套参数：
 *   position: fixed; top: 0; max-height: 100vh
 * 这样它铺满视口上限、并且不随页面滚动移动（内容超出时自己内部滚动）。
 *
 * 之前这里是 `sticky top-$yun-margin-top w-80`：
 *   - sticky 会跟着页面滚，和右边的 fixed 表现不一致
 *   - w-80 只有 320px，比右栏的 400px 窄，两栏对不齐
 */
.yun-layout-left {
  display: none;
}

@media (width >= 1024px) {
  .yun-layout-left {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10;
    width: 400px;
    max-height: 100vh;
    overflow-y: auto;
  }
}
</style>
