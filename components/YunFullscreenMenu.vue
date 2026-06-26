<script setup lang="ts">
import { ref } from 'vue'
import { useYunAppStore } from '../node_modules/valaxy-theme-yun/stores'
import { useRoute } from 'vue-router'
import YunPostsInfo from './YunPostsInfo.vue';
import { IsApp } from '../composables/layout'

const yunApp = useYunAppStore()
const fullscreenMenuRef = ref<HTMLElement>()
const route = useRoute()
const isapp = IsApp()
//  || (!(route.meta.layout == '404') && !(route.meta.layout === 'home') && !app.isMobile)

</script>

<template>
  <Transition name="slide-left">
    <div
      v-if="yunApp.fullscreenMenu.isOpen || (!(route.meta.layout == '404') && !(route.meta.layout === 'home') && !isapp)" 
      ref="fullscreenMenuRef"
      p="t-12 md:t-20"
      class="yun-fullscreen-menu fixed left-0 right-0 bottom-0 top-0 bg-$va-c-bg-soft z-$yun-z-fullscreen-menu overflow-auto max-w-[400px] shadow-lg"
    >
      <!-- <div v-if="app.isMobile" class="flex-center gap-2">
        <YunToggleDark transition />
        <YunToggleLocale v-if="app.showToggleLocale" />
      </div> -->

      <!-- <YunFullscreenMenuList /> -->
       <!--站点名称、头像、简介（居中展示）-->
      <YunSiteInfo class="text-center" />
      <!--渐变半透明分割线-->
      <YunGradientDivider class="my-2 op-20" />
      <!--文章统计（总文章数、分类、标签数量）-->
      <YunPostsInfo />
      <YunGradientDivider class="my-2 op-20" />
      <!--社交链接-->
      <YunSocialLinks />
      <YunGradientDivider class="my-2 op-20" />
      <!--自定义侧边导航链接-->
      <YunSidebarLinks />

      <YunGradientDivider class="my-2 op-20 lg:hidden" />

      <!--网站设置面板（暗黑模式、多语言）-->
      <div class="flex-center">
        <YunConfig />
      </div>
    </div>
  </Transition>
</template>

<style lang="scss">
@use 'sass:map';
@use 'valaxy-theme-yun/styles/vars.scss' as *;

.slide-left-enter-active,
.slide-left-leave-active,
.slide-down-enter-active,
.slide-down-leave-active {
  opacity: 1;
  transition: transform var(--va-transition-duration) map.get($cubic-bezier, 'ease-in-out'),
    opacity var(--va-transition-duration-fast) map.get($cubic-bezier, 'ease-in-out');
  transform: translateY(0);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

.slide-left-enter-from,
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}
</style>
