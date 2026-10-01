import { ref } from 'vue'

/**
 * 左侧抽屉侧边栏的开关状态。
 *
 * 为什么不用 useYunAppStore 里的 leftSidebar：
 * 那个是主题为 Strato 模式准备的，而 App.vue 里还有一个 watch 会按路由
 * 自动把它打开（非主页就 true）——正是「一进文章页侧边栏自己弹出来」的来源。
 * 这里单独放一个轻量状态，只由用户点击控制，行为可预测。
 */
const isOpen = ref(false)

export function useLeftDrawer() {
  return {
    isOpen,
    open: () => {
      isOpen.value = true
    },
    close: () => {
      isOpen.value = false
    },
    toggle: () => {
      isOpen.value = !isOpen.value
    },
  }
}
