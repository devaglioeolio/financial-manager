import { ref, nextTick } from 'vue'

// 전역 toast 상태
const toasts = ref([])

export function useToast() {
  
  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    const toast = {
      id,
      message,
      type, // success, error, warning, info
      duration,
      visible: false
    }
    
    toasts.value.push(toast)
    
    // DOM이 업데이트된 후 애니메이션 시작
    nextTick(() => {
      const toastIndex = toasts.value.findIndex(t => t.id === id)
      if (toastIndex !== -1) {
        toasts.value[toastIndex].visible = true
      }
    })
    
    // 자동 제거
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }
  
  const removeToast = (id) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      // 애니메이션을 위해 visible을 false로 설정
      toasts.value[index].visible = false
      // 300ms 후 실제로 제거 (CSS transition 시간)
      setTimeout(() => {
        const currentIndex = toasts.value.findIndex(toast => toast.id === id)
        if (currentIndex > -1) {
          toasts.value.splice(currentIndex, 1)
        }
      }, 300)
    }
  }
  
  const clearAllToasts = () => {
    toasts.value.forEach(toast => {
      toast.visible = false
    })
    setTimeout(() => {
      toasts.value.length = 0
    }, 300)
  }
  
  // 편의 메서드들
  const showSuccess = (message, duration) => showToast(message, 'success', duration)
  const showError = (message, duration) => showToast(message, 'error', duration)
  const showWarning = (message, duration) => showToast(message, 'warning', duration)
  const showInfo = (message, duration) => showToast(message, 'info', duration)
  
  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
} 