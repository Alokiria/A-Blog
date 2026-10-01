<script setup lang="ts">
/**
 * 首页开场动画（nimbo 模式）
 *
 * 这是原项目的自定义版本，保留原有的动画序列：
 *   1. 头像外框方块从「旋转 135°、无圆角」过渡到「正圆、无旋转」（.enter-from → .enter-to）
 *   2. 头像外框同时触发线条爆发特效 LineBurstEffects
 *   3. 头像自身淡入
 *   4. 动画结束后 showContent = true，下方作者信息 / 站点信息 / 社交链接 / 导航按钮依次淡入
 *
 * 与主题内置 YunPrologueSquare 的差异（也就是「原有动画」的部分）：
 *   - 头像层独立绝对定位，show 时整体上移 65%，让文字占据方块原本的位置
 *   - 导航按钮里的「文章」入口改为平滑滚动到文章列表，而不是跳转路由
 *
 * 若想改回主题默认外观，删除本文件即可（layouts/home.vue 里同步改回主题组件）。
 */
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeConfig } from '../../node_modules/valaxy-theme-yun/composables'

const themeConfig = useThemeConfig()
const { t } = useI18n()

const showContent = ref(false)

let isScrolling = false

/** 点击「文章」按钮：平滑滚动到文章列表顶部，找不到列表则滚到页面底部 */
function scrollToPosts() {
  if (isScrolling)
    return
  isScrolling = true
  nextTick(() => {
    const viewportH = window.innerHeight
    const pageTotalH = document.documentElement.scrollHeight
    const target = document.querySelector('.yun-post-list') as HTMLElement | null

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    else {
      window.scrollTo({ top: pageTotalH - viewportH, behavior: 'smooth' })
    }
  })
  // 滚动防抖锁定 1s
  setTimeout(() => (isScrolling = false), 1000)
}

const pages = computed(() => themeConfig.value.pages ?? [])
</script>

<template>
  <div flex="~ col" class="yun-square-container items-center justify-center text-center max-w-2xl">
    <slot />

    <!-- 头像 + 文字父容器：相对定位，绑 show 控制整体过渡 -->
    <div
      flex="~ col center"
      class="info-with-avatar relative duration-800 transition-cubic-bezier-ease-in"
      :class="{ show: showContent }"
    >
      <!-- 头像独立层：绝对定位铺满父容器，show 时上移 65% -->
      <div
        class="avatar-center-wrapper absolute inset-0 flex-center pointer-events-none z-10"
        :class="{ show: showContent }"
      >
        <Transition
          enter-from-class="enter-from"
          enter-to-class="enter-to"
          appear
          @after-appear="showContent = true"
        >
          <!-- 头像外框：进入时从旋转 135° 的方块收成圆形 -->
          <div flex="~ col" class="yun-square square-rotate z-1 bg-white/80">
            <LineBurstEffects
              class="absolute top-0 left-0 right-0 bottom-0 size-full scale-200"
              :delay="200"
              :duration="400"
            />

            <!-- 第二层过渡：头像自身淡入 -->
            <Transition
              enter-from-class="op-0"
              enter-to-class="op-100"
              enter-active-class="transition-400 delay-400"
              appear
            >
              <YunAuthorAvatar />
            </Transition>
          </div>
        </Transition>
      </div>

      <!-- 作者信息 / 站点信息 / 社交链接 / 导航按钮 -->
      <div class="info" :class="{ show: showContent }">
        <YunAuthorName class="mt-3" />
        <YunAuthorIntro />

        <div class="py-4 md:py-5 lg:pt-6">
          <YunAnimLineDraw :active="showContent" />
        </div>

        <div flex="~ col" class="gap-2 items-center justify-center">
          <YunSiteTitle />
          <YunSiteSubtitle />
          <YunSiteDescription />
        </div>

        <div class="scale-x--100 py-4 md:py-5 lg:pb-6">
          <YunAnimLineDraw :active="showContent" />
        </div>

        <YunSocialLinks />

        <div class="prologue-navigation mt-4 flex-center w-72 md:w-150 m-auto gap-2" flex="~ wrap">
          <!-- 原主题此处是带 url 跳转的链接，这里改为点击滚动到文章列表 -->
          <div @click.prevent="scrollToPosts">
            <YunSiteLinkItem
              :page="{
                name: t('menu.posts'),
                icon: 'i-ri-article-line',
                url: '',
              }"
            />
          </div>

          <slot />

          <YunSiteLinkItem v-for="(item, i) in pages" :key="`${item.url}-${i}`" :page="item" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'sass:map';
@use 'valaxy-theme-yun/styles/vars.scss' as *;

.yun-square {
  transition: all 0.8s map.get($cubic-bezier, 'ease-in');
  border-radius: 50%;
  transform: rotate(0deg) translateY(0%);
  width: var(--avatar-size);
  height: var(--avatar-size);
  box-shadow: 0 5px 100px rgb(0 0 0 / 0.15);

  &.enter-from {
    border-radius: 0%;
    transform: rotate(135deg) translateY(0%);
    box-shadow: none;
  }
}

.yun-square-container {
  --avatar-size: 100px;

  // 头像独立层，初始居中，show 后上移
  .avatar-center-wrapper {
    transition: all 0.8s map.get($cubic-bezier, 'ease-in');

    &.show {
      transform: translateY(-65%);
    }
  }

  .info-with-avatar {
    position: relative;
  }

  // show 之前完全透明，show 后淡入
  .info {
    position: relative;
    opacity: 0;
    transform: translateY(0);
    transition: all 0.8s map.get($cubic-bezier, 'ease-in');

    &.show {
      opacity: 1;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .yun-square,
  .yun-square.enter-from {
    transform: none;
    border-radius: 50%;
    transition: opacity 150ms ease;
  }

  .yun-square-container {
    .avatar-center-wrapper,
    .info {
      transition: opacity 150ms ease;
    }

    .avatar-center-wrapper.show {
      transform: none;
    }
  }
}
</style>

<!--
  窄屏：把「横幅」与「本站信息」叠在同一个网格单元里。

  主题原本在 `layouts/home.vue` 里写了这段规则，但项目覆盖了该布局文件，
  主题那份 scoped 样式就不再被加载（DOM 上只有本地布局的 data-v 属性）。
  缺了它，窄屏下 `.yun-home-prologue-content` 退回 `position: relative` 后
  不再与横幅重叠，会被顺次挤到横幅**下方**，凭空多出一整屏高度，
  把下面的一言（谚语）与文章列表整体推走。

  这里必须用**非 scoped** 的 style 块：`.yun-home-prologue` 是父级容器，
  写成 scoped 会被编译成后代选择器 `[data-v-xxx] .yun-home-prologue`，
  永远匹配不到祖先节点。`.yun-home-prologue` 类由本地布局绑在本组件根节点上。
-->
<style lang="scss">
@media (width <= 768px) {
  .yun-home-prologue {
    display: grid;
  }

  .yun-home-prologue #yun-banner,
  .yun-home-prologue #yun-banner-placeholder {
    grid-area: 1 / 1;
    height: 100%;
  }

  .yun-home-prologue-content {
    position: relative;
    inset: auto;
    grid-area: 1 / 1;
    box-sizing: border-box;
    min-height: var(--banner-container-height, calc(100 * var(--vh)));
    padding: calc(var(--yun-nav-height) + 20px) 20px 36px;
  }
}
</style>