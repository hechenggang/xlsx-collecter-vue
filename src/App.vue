<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { NMessageProvider } from 'naive-ui'
</script>

<template>
  <router-view v-slot="{ Component }">
    <suspense>
      <n-message-provider>
        <component :is="Component" />
      </n-message-provider>
    </suspense>
  </router-view>
</template>

<style>
</style>
