<script setup lang="ts">
import { reactive } from 'vue'

const versions = reactive({ ...window.electron.process.versions })
</script>

<template>
  <ul class="info">
    <li class="electron-version">
      <a href="https://github.com/tiandi0228/electron-wallpaper" target="_blank"
        >版本 v{{ versions.electron }}</a
      >
    </li>
  </ul>
</template>
