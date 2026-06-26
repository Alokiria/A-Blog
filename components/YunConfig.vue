<script lang="ts" setup>
import { useAppStore } from 'valaxy'
import { useYunAppStore } from '../node_modules/valaxy-theme-yun/stores'

// sidebar config
const app = useAppStore()
const yun = useYunAppStore()
</script>

<template>
  <div v-if="!yun.isStrato">
    <YunToggleDark class="rounded-none!" transition />

    <YunToggleLocale v-if="app.showToggleLocale" />
  </div>
</template>
