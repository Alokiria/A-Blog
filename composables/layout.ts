import { useMediaQuery } from '@vueuse/core'



// 小屏：宽度 ≤ 1024px（对应你写的 max-width:1024）
export function IsApp() {
  return useMediaQuery('(max-width: 1024px)')
}