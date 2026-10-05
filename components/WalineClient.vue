<script lang="ts" setup>
/**
 * WalineClient 覆盖版：把「评论上传图片」的大小上限从 128 KB 调大。
 *
 * ── 这个文件为什么存在 ────────────────────────────────────────────────
 *
 * Waline 3.x **没有**「图片大小限制」这个配置项（2.x 时代的 `MAX_SIZE`
 * 环境变量已经不存在，服务端文档里也查不到）。上限是写死在
 * `@waline/client` 默认上传函数里的：
 *
 *     if (file.size > 128e3) throw new Error('File too large! File size limit 128KB')
 *     // 否则 FileReader.readAsDataURL() —— 转成 Base64 塞进评论内容
 *
 * 而客户端的取值逻辑是「传函数就用你的函数，不传才用默认那个」：
 *     imageUploader: typeof v === 'function' ? v : v === false ? false : 默认函数
 * 所以想改上限，唯一的办法就是**自己提供一个 imageUploader**。
 *
 * ⚠️ 不能写在 valaxy.config.ts 的 addonWaline() 里：Valaxy 是把配置
 * `JSON.stringify` 之后注入客户端的（见 valaxy 的 client/config.ts，
 * 客户端 `JSON.parse(valaxyConfig)`），而 JSON 会**直接丢掉函数**，
 * 那里传函数是无效的（类型能过、运行时没有）。所以函数必须在组件里定义。
 *
 * ── 工作机制 ──────────────────────────────────────────────────────────
 *
 * 组件链：`YunComment` → 主题 `YunWaline` → 插件 `WalineClient`
 * （`valaxy-addon-waline/components/WalineClient.vue`）。本项目里同名的
 * `components/*.vue` 会覆盖主题/插件的组件（和 `AppLink.vue` 同一个机制），
 * 于是这个文件就顶替掉了插件的那个。
 *
 * 除了多传一个 `imageUploader`，其它都照抄插件原文件：`options` 全量透传，
 * serverURL / lang / path / dark / emoji 保持一致。**插件升级后如果原文件
 * 新增了属性或行为，需要把改动同步回来。**
 *
 * ── 上限与代价 ────────────────────────────────────────────────────────
 *
 * 当前是 Base64 方案（不接图床）：图片会以 `data:image/...` 的形式直接写进
 * 评论内容。所以上限不能随便调很大，有两层硬约束：
 *   1. 服务端请求体上限：Vercel Serverless Function 是 **4.5 MB**（整个
 *      POST 评论的 JSON，不只是图片）；
 *   2. Base64 会让体积**膨胀约 33%**（读文件本身还多占约 1/3 内存）。
 * 1.8 MB 的图 → Base64 后约 2.4 MB，留有余量；调得再大就有提交失败的风险。
 *
 * 想传更大的图，正确做法是接图床（把下面这个函数换成「上传到图床、返回
 * 图片 URL」），这样评论里只存一个短链接，也就没有这个上限了。
 */
import type { WalineOptions } from 'valaxy-addon-waline/types'
import { commentCount, pageviewCount } from '@waline/client'
// @ts-expect-error vue waline component type
import { Waline } from '@waline/client/component'
import { useAppStore } from 'valaxy'

import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import '@waline/client/style'

const props = defineProps<{
  options: WalineOptions
}>()

const appStore = useAppStore()

const route = useRoute()
const { locale } = useI18n()
const path = computed(() => props.options.path || route.path.replace(/\/$/, ''))

/**
 * 表情包的 CDN 路径拼接。
 *
 * 这一段是从 `valaxy-addon-waline/utils/index.ts` 抄进来的（原实现就这么多），
 * 之所以不 import：插件 package.json 的 `exports` 是 `{ "./*": "./*" }`，
 * `valaxy-addon-waline/utils` 这种「目录式」子路径在 rolldown 里加载不了
 * （构建直接报 `Could not load .../utils`），插件自己的组件用的是相对路径
 * `../utils` 所以没暴露这个问题。插件升级后如果这段逻辑有变，同步过来即可。
 */
function getEmojis(cdn = '//unpkg.com/', types = ['bilibili', 'qq', 'weibo'], emoji?: string[]) {
  if (!emoji || emoji.length === 0)
    return types.map(type => `${cdn}@waline/emojis/${type}/`)

  const typePaths = types.map(type => `${cdn}@waline/emojis/${type}/`)
  const emojiPaths = emoji.map(item => `${item}/`)
  return [...typePaths, ...emojiPaths]
}

const emoji = computed(() => getEmojis(props.options.cdn, props.options.types, props.options.emoji))

onMounted(() => {
  const { pageview, comment } = props.options

  if (pageview) {
    pageviewCount({
      serverURL: props.options.serverURL,
      path: path.value,
      selector: typeof pageview === 'string' ? pageview : undefined,
    })
  }

  if (comment) {
    commentCount({
      serverURL: props.options.serverURL,
      path: path.value,
      selector: typeof comment === 'string' ? comment : undefined,
    })
  }
})

/* ------------------------------------------------------------------ *
 * 上传上限（想改大小就改这一行）
 * ------------------------------------------------------------------ */

/** 允许上传的图片大小上限（字节）。默认 1.8 MB。 */
const MAX_IMAGE_SIZE = 1.8 * 1024 * 1024

/** 报错时给人看的大小，例如 `1.8 MB` */
const maxSizeLabel = `${(MAX_IMAGE_SIZE / 1024 / 1024).toFixed(1)} MB`

/**
 * 自定义图片上传：校验大小后转成 Base64 内嵌（与 Waline 默认行为一致，
 * 只是把 128 KB 换成了 MAX_IMAGE_SIZE）。
 *
 * 失败时抛出的信息会由 Waline 通过 `alert()` 显示出来 —— 不抛异常的话，
 * 上传按钮会一直卡在 loading 状态。
 */
function uploadImageAsBase64(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_SIZE) {
    const size = (file.size / 1024 / 1024).toFixed(1)
    return Promise.reject(new Error(
      `图片 ${size} MB，超过上限 ${maxSizeLabel}。`
      + `请先压缩，或改 components/WalineClient.vue 里的 MAX_IMAGE_SIZE。`,
    ))
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('图片读取失败，请重试。'))
  })
}
</script>

<template>
  <Waline
    v-bind="options"
    :server-u-r-l="options.serverURL"
    :lang="locale"
    :path="path"
    :dark="appStore.isDark"
    :emoji="emoji"
    :image-uploader="uploadImageAsBase64"
  />
</template>

<style>
:root {
  --waline-theme-color: var(--va-c-primary);
  --waline-active-color: var(--va-c-primary-light);
}
</style>
