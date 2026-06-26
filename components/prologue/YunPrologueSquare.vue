<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import YunPostList from '../YunPostList.vue'
import { useThemeConfig } from '../../node_modules/valaxy-theme-yun/composables'

const themeConfig = useThemeConfig()
const { t } = useI18n()

const showContent = ref(false)

let isScrolling = false
// 点击文章按钮滚动函数
function scrollToPosts() {
    if (isScrolling) return
    isScrolling = true
    nextTick(() => {
        const viewportH = window.innerHeight
        const pageTotalH = document.documentElement.scrollHeight
        // 根据你文章列表固定 class .yun-post-list 获取容器
        const target = document.querySelector('.yun-post-list') as HTMLElement | null

        if (target) {
            // 有文章：滚动到列表顶部，第一篇贴视口最上方
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        } else {
            // 无文章/找不到列表，直接滚页面最底部
            window.scrollTo({
                top: pageTotalH - viewportH,
                behavior: 'smooth'
            })
        }
    })
    // 滚动防抖锁定 1s
    setTimeout(() => isScrolling = false, 1000)
}
</script>


<template>
    <!--- 1. 外部容器，用于包含以下所有的组件 -->
    <div flex="~ col" class="yun-square-container items-center justify-center text-center max-w-2xl">
        <slot />

        <!-- 3. 头像+文字整体父容器：垂直居中、相对定位，绑定show类控制动画，当头像动画结束后，showContext为true，则追加.show，可以选择是否触发动画，查看SCSS-->
        <div flex="~ col center" class="info-with-avatar relative duration-800 transition-cubic-bezier-ease-in" :class="{
            show: showContent,
        }">

            <!-- 单独的头像容器，可以自由更改，不受文字影响 -->
            <div class="avatar-center-wrapper absolute inset-0 flex-center pointer-events-none z-10" :class="{
                show: showContent,
            }">

                <!-- 2. Vue内置过渡组件，控制头像入场动画，页面加载自动触发appear，动画执行结束后将showContent设置为true -->
                <Transition enter-from-class="enter-from" enter-to-class="enter-to" appear
                    @after-appear="showContent = true">

                    <!-- 2-1.头像外框方块容器：垂直弹性、层级1、半透明白色背景 -->
                    <div flex="~ col" class="yun-square square-rotate z-1 bg-white/80">


                        <!-- 2-2.头像背景线条爆发特效组件 -->
                        <LineBurstEffects class="absolute top-0 left-0 right-0 bottom-0 size-full scale-200"
                            :delay="200" :duration="400" />


                        <!-- 2-3.第二层过渡：控制头像自身淡入动画 -->
                        <Transition enter-from-class="op-0" enter-to-class="op-100"
                            enter-active-class="transition-400 delay-400" appear>


                            <!-- 2-4.头像组件 -->
                            <YunAuthorAvatar />


                        </Transition>
                    </div>
                </Transition>
            </div>

            <!-- 4.showContent后才显示，可查看下面SCSS，作者信息、站点介绍、导航按钮容器，绑定show控制透明度动画 -->
            <div class="info" :class="{
                show: showContent,
            }">

                <!-- 博主名称组件，顶部外边距3 -->
                <YunAuthorName class="mt-3" />
                <!-- 博主简介组件 -->
                <YunAuthorIntro />

                <!-- 上下分割线容器，响应式垂直内边距 -->
                <div class="py-4 md:py-5 lg:pt-6">
                    <!-- 手绘线条动画组件，active为true才执行绘制动画 -->
                    <YunAnimLineDraw :active="showContent" />
                </div>
                <!-- 站点标题组容器：垂直弹性、居中、元素间距2 -->
                <div flex="~ col" class="gap-2 items-center justify-center">
                    <!-- 站点主标题 -->
                    <YunSiteTitle />
                    <!-- 站点副标题 -->
                    <YunSiteSubtitle />
                    <!-- 站点描述文案 -->
                    <YunSiteDescription />
                </div>
                <!-- 下方反转分割线容器，水平翻转，响应式内边距 -->
                <div class="scale-x--100 py-4 md:py-5 lg:pb-6">
                    <YunAnimLineDraw :active="showContent" />
                </div>

                <!-- 社交链接图标组 -->
                <YunSocialLinks />

                <!-- 导航按钮外层容器：居中、最大宽度自适应、自动外边距、自动换行、按钮间距2 -->
                <div class="mt-4 flex-center w-72 md:w-150 m-auto gap-2" flex="~ wrap">
                    <!-- 固定文章列表入口按钮，i18n读取菜单文字，配置图标与跳转地址 -->
                     <!-- 原带url跳转的YunSiteLinkItem 改为外层包裹点击事件，清空url阻止页面跳转 -->
                    <div @click.prevent="scrollToPosts">
                        <YunSiteLinkItem :page="{
                            name: t('menu.posts'), // 多语言翻译文章菜单名称
                            icon: 'i-ri-article-line', // Remix图标：文章线条图标
                            url: '',  // 文章页面路由地址
                        }" />
                    </div>
                    <slot />
                    <!-- 循环渲染主题配置里用户自定义的页面导航按钮 -->
                    <!-- 遍历主题配置的pages数组 -->
                    <YunSiteLinkItem v-for="item, i in themeConfig.pages" :key="i" :page="item" />
                </div>
            </div>
        </div>
    </div>
</template>


<!-- 下面是CSS样式 -->
<style lang="scss" scoped>
// use scoped for css injection
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

        // width: var(--total-char-height);
        // height: var(--total-char-height);
        transform: rotate(135deg) translateY(0%);
        box-shadow: none;
    }
}

.yun-square-container {
    --avatar-size: 100px;

    // 核心：头像独立层，初始居中
    .avatar-center-wrapper {
        transition: all 0.8s map.get($cubic-bezier, 'ease-in');

        &.show {
            transform: translateY(-65%);
        }
    }

    // 默认是注释掉的动画，在头像加载完后，如果取消注释会头像和文字整体竖直向上移动一半距离
    .info-with-avatar {
        position: relative;

        &.show {
            // transform: translateY(-50%);
        }
    }

    // 4.当showContent的时候，会在结尾加上.show，才会触发下面的opacity:1，再往下注释掉的动画是向下移动一半距离
    .info {
        position: relative;
        opacity: 0;
        transform: translateY(0);
        transition: all 0.8s map.get($cubic-bezier, 'ease-in');

        &.show {
            opacity: 1;

            //   transform: translateY(calc(50% + var(--avatar-size) / 2));
        }
    }
}
</style>
