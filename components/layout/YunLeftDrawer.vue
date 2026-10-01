<script lang="ts" setup>
/**
 * 左侧抽屉式侧边栏。
 *
 * 行为参考主题右侧栏（components/YunAside.vue 的 .yun-aside）：
 *   position: fixed + transform: translateX(-100%) 收起，translateX(0) 展开，
 *   配一层 YunOverlay 遮罩。
 * 区别是它**始终是浮层**（不像右栏在 xl 以上会常驻占位），
 * 所以平时不占左栏宽度，点按钮才滑出来盖在内容上。
 */
import { useLeftDrawer } from '../composables/left-drawer'

const { isOpen, close } = useLeftDrawer()
</script>

<template>
  <YunOverlay :show="isOpen" @click="close" />

  <aside class="yun-left-drawer" :class="{ open: isOpen }" aria-label="侧边栏">
    <div class="yun-left-drawer__inner">
      <YunSidebarCard />
      <YunAdBoard />
    </div>
  </aside>
</template>

<style lang="scss">
@use 'sass:map';
@use 'valaxy-theme-yun/styles/vars.scss' as *;

.yun-left-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: var(--yun-z-aside);
  width: 360px;
  max-width: 86vw;
  overflow-y: auto;
  // 收起时整体移出视口左侧
  transform: translateX(-100%);
  transition: transform var(--va-transition-duration-fast) map.get($cubic-bezier, 'ease-in-out');
  // 用卡片自身的背景色，避免和页面背景糊在一起
  background-color: var(--va-c-bg-soft);

  &.open {
    transform: translateX(0);
  }

  &__inner {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
}
</style>
