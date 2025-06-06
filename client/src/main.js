import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// axios 기본 설정
axios.defaults.baseURL = 'http://localhost:5000'  // 백엔드 서버 주소
axios.defaults.withCredentials = true  // 쿠키를 포함한 요청 허용
axios.defaults.headers.common['Content-Type'] = 'application/json'
axios.defaults.headers.common['Accept'] = 'application/json'
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

// 요청 인터셉터 추가
axios.interceptors.request.use(
  (config) => {
    // 환경 변수에서 테스트용 토큰 사용
    config.headers.Authorization = `Bearer ${import.meta.env.VITE_TEMP_TOKEN}`
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 추가
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API 요청 에러:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

const app = createApp(App)
app.use(router)
app.mount('#app') 