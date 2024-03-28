<template>
  <div>
    <Wallpaper @chang-img="ipcHandleChangedWallpaper" />
    <div class="btn-box">
      <button class="btn" @click="ipcHandleSetWallpaper">设为壁纸</button>
    </div>
    <Versions />
  </div>
</template>

<script setup lang="ts">
import Wallpaper from '@renderer/components/Wallpaper.vue'
import Versions from '@renderer/components/Versions.vue'
import { ElMessage } from 'element-plus'
import { ref, onMounted } from 'vue'

const setUrl = ref<string>('')
// const setPath = ref<string>('')

onMounted(() => {
  // 设置壁纸后的状态
  window.electron.ipcRenderer.on('wallpaper:status', (_, status: boolean) => {
    if (!status) {
      ElMessage.error('设置失败')
    }
  })
  // 下载到本地后返回的path
  // window.electron.ipcRenderer.on('wallpaper:done', (_, path: string) => {
  //  setPath.value = path
  // })
})

// 发送url地址去下载到本地
const ipcHandleChangedWallpaper = (url: string) => {
  setUrl.value = url
  // window.electron.ipcRenderer.send('wallpaper:url', url)
}

// 设为壁纸
const ipcHandleSetWallpaper = () => {
  if (setUrl.value) {
    window.electron.ipcRenderer.send('wallpaper:change', setUrl.value)
  }
}
</script>
