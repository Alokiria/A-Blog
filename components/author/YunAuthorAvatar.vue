<script setup lang="ts">
/**
 * 覆盖主题的 YunAuthorAvatar（node_modules/valaxy-theme-yun/components/author/YunAuthorAvatar.vue）。
 *
 * 唯一区别是给 <img> 加了 referrerpolicy="no-referrer"：
 * cnblogs 图床（images.cnblogs.com）只放行「不带 Referer」或「来自 cnblogs 自己」的请求，
 * 浏览器在站点上默认会带上本站 Referer，于是头像被 403 挡掉。
 */
import { useSiteConfig } from 'valaxy'

const siteConfig = useSiteConfig()
</script>

<template>
  <div class="relative yun-author-avatar">
    <div class="absolute size-full avatar-bg bg-image-$yun-home-hero-image-background-image filter-blur-2xl op-30" />
    <img
      class="rounded-full size-full bg-white dark:bg-white/20 p-1 m-0 absolute"
      referrerpolicy="no-referrer"
      :src="siteConfig.author.avatar"
      alt="avatar"
    >
    <span
      v-if="siteConfig.author.status.emoji"
      class="site-author-status absolute"
      :title="siteConfig.author.status.message || undefined"
    >{{ siteConfig.author.status.emoji }}</span>
  </div>
</template>

<style lang="scss">
.yun-author-avatar {
  width: var(--avatar-size, 96px);
  height: var(--avatar-size, 96px);
}

.site-author-avatar {
  img {
    box-shadow: 0 0 10px rgb(black, 0.2);
    transition: var(--va-transition-duration-moderate);

    &:hover {
      box-shadow: 0 0 30px rgb(var(--va-c-primary-rgb), 0.2);
    }
  }
}

.site-author-status {
  height: 1.8rem;
  width: 1.8rem;
  bottom: 0;
  right: 0;
  line-height: 1.8rem;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
  background-color: var(--va-c-bg-light);
  border: 1px solid rgb(255 255 255 / 0.1);
}
</style>
