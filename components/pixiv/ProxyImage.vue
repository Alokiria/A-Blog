<script lang="ts" setup>
/**
 * Pixiv 图片组件：自动在代理链里挑一个能用的域名。
 *
 * 候选 URL 由 `buildImageCandidates` 生成（原域名 → 代理域名 → 按 id 取原图 → 原地址），
 * 加载失败就换下一个；全部失败则显示占位。
 * 每个域名的成败会记进 localStorage，下次优先用历史可用的域名。
 */
import { buildImageCandidates, reportProxyResult } from '../../composables/pixiv-image'
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  /** 主图地址 */
  src: string
  /** 作品 id，用于 i.loli.best/{id} 兜底 */
  illustId?: number | string
  /** 代理域名链；不传则只用原地址 */
  proxies?: string[]
  alt?: string
  /** 加载中显示骨架 */
  skeleton?: boolean
  /** 是否用 referrerpolicy 兜底（对部分代理有用） */
  noReferrer?: boolean
  /**
   * 是否允许 `https://i.loli.best/{id}` 这种「按 id 取原图」的兜底。
   * 它返回的是原图，可能好几 MB，列表里建议关掉，灯箱里再开。
   */
  fallbackById?: boolean
}>(), {
  proxies: () => [],
  alt: '',
  skeleton: false,
  noReferrer: true,
  fallbackById: true,
})

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'failed'): void
}>()

const candidates = computed(() => buildImageCandidates(
  props.src,
  props.proxies,
  props.fallbackById ? props.illustId : undefined,
))

const index = ref(0)
const loaded = ref(false)
const failed = ref(false)

watch(candidates, () => {
  index.value = 0
  loaded.value = false
  failed.value = false
})

const currentSrc = computed(() => candidates.value[index.value] ?? '')

function onLoad() {
  loaded.value = true
  if (currentSrc.value) {
    const host = currentSrc.value.match(/^https?:\/\/([^/]+)/i)?.[1]
    if (host)
      reportProxyResult(host, true)
  }
  emit('loaded')
}

function onError() {
  const host = currentSrc.value.match(/^https?:\/\/([^/]+)/i)?.[1]
  if (host)
    reportProxyResult(host, false)

  // 还有候选就继续换，否则标记失败
  if (index.value < candidates.value.length - 1) {
    index.value++
    return
  }

  failed.value = true
  emit('failed')
}
</script>

<template>
  <span class="pixiv-img">
    <span v-if="skeleton && !loaded && !failed" class="pixiv-img__skeleton" aria-hidden="true" />
    <span v-if="failed" class="pixiv-img__failed" aria-hidden="true">
      <span i-ri-image-2-line />
    </span>
    <img
      v-if="currentSrc && !failed"
      :src="currentSrc"
      :alt="alt"
      :referrerpolicy="noReferrer ? 'no-referrer' : undefined"
      loading="lazy"
      decoding="async"
      class="pixiv-img__el"
      :class="{ 'is-loaded': loaded }"
      @load="onLoad"
      @error="onError"
    >
  </span>
</template>

<style lang="scss" scoped>
.pixiv-img {
  position: relative;
  display: block;
  width: 100%;
  /*
   * 这里刻意不给高度、也不给 object-fit：
   * 不同场景需要不同的适配方式（列表要裁切、灯箱要完整显示），
   * 由使用它的组件通过 :deep(.pixiv-img__el) 覆盖。
   */
  overflow: hidden;
}

.pixiv-img__el {
  display: block;
  width: 100%;
  height: auto;
  opacity: 0;
  transition: opacity 0.35s ease;

  &.is-loaded {
    opacity: 1;
  }
}

.pixiv-img__skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    rgb(128 128 128 / 0.1) 30%,
    rgb(128 128 128 / 0.2) 50%,
    rgb(128 128 128 / 0.1) 70%
  );
  background-size: 300% 100%;
  animation: pixiv-img-shimmer 1.4s ease-in-out infinite;
}

.pixiv-img__failed {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(128 128 128 / 0.1);
  font-size: 22px;
  opacity: 0.35;
}

@keyframes pixiv-img-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
</style>
