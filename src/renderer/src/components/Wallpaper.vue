<template>
  <div class="wallpaper" @click="setWallpaper">
    <img :src="setImg" alt="" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { get } from '@renderer/utils/request'
import { Wallpaper } from './types'

const emit = defineEmits(['chang-img'])

const list = ref<string[]>([])
const setImg = ref<string>('')
const index = ref<number>(0)

onMounted(() => {
  getWallpaper()
})

const getWallpaper = () => {
  get('http://wp.birdpaper.com.cn/intf/newestList?pageno=1&count=50').then((res) => {
    if (res.data && res.data.list) {
      res.data.list.forEach((item: Wallpaper) => {
        list.value.push(item.url)
      })
      setImg.value = list.value[0]
      // window.electron.ipcRenderer.send('wallpaper:url', list.value[0])
      emit('chang-img', setImg.value)
    }
  })
}

const setWallpaper = () => {
  index.value++
  if (index.value === list.value.length) {
    index.value = 0
  }
  setImg.value = list.value[index.value]
  emit('chang-img', setImg.value)
}
</script>
