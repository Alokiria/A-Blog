<script lang="ts" setup>
import { useAppStore } from 'valaxy'
import { useThemeConfig } from '../node_modules/valaxy-theme-yun/composables'
import { useYunAppStore } from '../node_modules/valaxy-theme-yun/stores'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import YunPrologueSquare from '../components/prologue/YunPrologueSquare.vue'

const yun = useYunAppStore()
const app = useAppStore()
const route = useRoute()
const themeConfig = useThemeConfig()

const isPage = computed(() => route.path.startsWith('/page'))

const showNotice = computed(() => {
  const notice = themeConfig.value?.notice
  return notice?.enable && (isPage.value ? !notice.hideInPages : true)
})
</script>

<template>
  <!-- 全局布局外壳组件, 在主页取消页边距 -->
  <YunLayoutWrapper :no-margin="!isPage">
    <!-- 整站内容统一水平居中、垂直纵向排列，底部预留内边距 -->
    <div
      class="w-full flex flex-col items-center pb-4 transition-all duration-300 ease-in-out relative"
      :class="{ 'ml-[400px]': yun.fullscreenMenu.isOpen && !app.isMobile }"
    >
      <template v-if="themeConfig.banner?.enable">
        <!-- 仅在主页渲染 Banner 与开场动画 -->
        <template v-if="!isPage">
          <div class="w-full">
            <!-- 外层 YunPrologue 只作为相对定位容器（不启用网格装饰）。
                 但必须带上主题的 `yun-home-prologue` 类：
                 它内含的移动端样式用 `display: grid` + 同一个 grid-area
                 把「横幅」与「头像/站点信息」叠在一起。漏掉这个类，
                 窄屏下头像区会被顺次挤到横幅下方，多占一屏高度，
                 把下方的一言（谚语）区域推下去。 -->
            <YunPrologue class="yun-home-prologue" :grid="{ enable: false }">
              <!-- ClientOnly：仅客户端渲染，SSR 服务端跳过，防止首屏 hydration 报错 -->
              <ClientOnly>
                <YunBanner />
                <template #fallback>
                  <div id="yun-banner-placeholder" class="w-full h-[var(--banner-container-height,100vh)]" />
                </template>
              </ClientOnly>

              <!-- Nimbo 模式 & 横幅动画完成后，渲染居中头像与站点信息 -->
              <Transition
                v-if="yun.isNimbo && yun.bannerAnimationDone"
                enter-from-class="scale-60 opacity-0"
                enter-to-class="scale-100 opacity-100"
                enter-active-class="transition-300 transition-cubic-bezier-ease-in-out"
                appear
              >
                <!-- 全屏绝对居中容器 -->
                <div class="yun-home-prologue-content absolute top-0 left-5 right-5 h-screen flex items-center justify-center">
                  <Transition
                    enter-from-class="op-0"
                    enter-to-class="op-100"
                    enter-active-class="transition-800"
                    appear
                  >
                    <YunPrologueSquare class="z-1" />
                  </Transition>
                </div>
              </Transition>
            </YunPrologue>

            <!-- 横幅下方一言 / 自定义文案组件 -->
            <YunSay v-if="themeConfig.say?.enable" w="full" />
          </div>
        </template>
      </template>

      <!-- 分页无 Banner 时，空占位高度，撑开导航栏 -->
      <div v-else class="h-$yun-nav-height" />

      <YunNotice
        v-if="showNotice"
        class="mb-4"
        :class="{ 'mt-4': !isPage }"
        :content="themeConfig.notice?.content"
      />
      <!-- 不显示公告时，首页预留顶部间距，分页不留 -->
      <div v-else-if="!isPage" class="mt-4" />

      <!-- 命名插槽：board 公告下方自定义内容区 -->
      <slot name="board" />

      <slot>
        <RouterView />
      </slot>
    </div>
  </YunLayoutWrapper>
</template>

<style scoped>
/* 移动端：让开场动画层与 Banner 共占同一网格单元，避免高度塌陷 */
@media (width <= 768px) {
  .yun-home-prologue-content {
    position: relative;
    inset: auto;
    box-sizing: border-box;
    min-height: var(--banner-container-height, calc(100 * var(--vh)));
    padding: calc(var(--yun-nav-height) + 20px) 20px 36px;
  }
}
</style>
