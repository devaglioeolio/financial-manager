<script setup lang="ts">
import { onMounted } from 'vue'
// @ts-ignore
import ToastContainer from './components/ToastContainer.vue'
// @ts-ignore
import LoadingIndicator from './components/LoadingIndicator.vue'
// @ts-ignore
import Navbar from './components/Navbar.vue'

// 앱이 시작될 때 초기화 작업
onMounted(() => {
  console.log('Finance Manager 앱이 시작되었습니다.')
})
</script>

<template>
  <div id="app">
    <Navbar />
    <main class="main-content">
      <router-view></router-view>
    </main>
  </div>
  <ToastContainer />
  <LoadingIndicator />
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');

:root {
  --primary-color: #2196F3;
  --text-color: #2c3e50;
  --background-color: #f5f7fa;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-color);
  background-color: var(--background-color);
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}

.main-content {
  padding-top: 60px; /* Navbar 높이만큼 여백 추가 */
}
</style>
 