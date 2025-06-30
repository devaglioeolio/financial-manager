<template>
  <Teleport to="body">
    <Transition name="loading-overlay">
      <div v-if="hasAnyLoading" class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <div class="loading-text">
            {{ loadingMessage }}
          </div>
          <div v-if="showDetails" class="loading-details">
            <div 
              v-for="key in getLoadingKeys" 
              :key="key" 
              class="loading-item"
            >
              {{ getLoadingLabel(key) }}
            </div>
          </div>
          <button 
            v-if="showDetails" 
            @click="showDetails = false"
            class="toggle-details"
          >
            숨기기
          </button>
          <button 
            v-else 
            @click="showDetails = true"
            class="toggle-details"
          >
            상세 보기
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useLoading } from '../composables/useLoading'

const { hasAnyLoading, getLoadingKeys } = useLoading()

const showDetails = ref(false)

const loadingMessage = computed(() => {
  const count = getLoadingKeys.value.length
  if (count === 1) {
    return getLoadingLabel(getLoadingKeys.value[0])
  }
  return `${count}개 작업 진행 중...`
})

const getLoadingLabel = (key) => {
  const labels = {
    'fetch-assets': '자산 정보 불러오는 중...',
    'fetch-exchange-rates': '환율 정보 불러오는 중...',
    'fetch-stock-data': '주식 정보 불러오는 중...',
    'add-asset': '자산 추가 중...',
    'add-transaction': '거래 추가 중...',
    'delete-asset': '자산 삭제 중...',
    'fetch-notifications': '알림 불러오는 중...',
    'fetch-goals': '목표 불러오는 중...',
    'save-settings': '설정 저장 중...',
    'fetch-watchlist': '관심종목 불러오는 중...',
    'search-stocks': '종목 검색 중...',
    'fetch-monthly-data': '월별 데이터 불러오는 중...',
    'fetch-daily-data': '일별 데이터 불러오는 중...',
    'backup-data': '데이터 백업 중...'
  }
  
  return labels[key] || `${key} 처리 중...`
}
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.loading-spinner {
  position: relative;
  width: 60px;
  height: 60px;
  margin: 0 auto 24px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
}

.spinner-ring:nth-child(2) {
  width: 80%;
  height: 80%;
  top: 10%;
  left: 10%;
  border-top-color: #764ba2;
  animation-duration: 1s;
  animation-direction: reverse;
}

.spinner-ring:nth-child(3) {
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
  border-top-color: #f093fb;
  animation-duration: 0.8s;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
}

.loading-details {
  background: #f9fafb;
  border-radius: 8px;
  padding: 12px;
  margin: 16px 0;
  max-height: 150px;
  overflow-y: auto;
}

.loading-item {
  font-size: 0.9rem;
  color: #6b7280;
  padding: 4px 0;
  border-bottom: 1px solid #e5e7eb;
}

.loading-item:last-child {
  border-bottom: none;
}

.toggle-details {
  background: none;
  border: 1px solid #d1d5db;
  color: #6b7280;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-details:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

/* Transition 애니메이션 */
.loading-overlay-enter-active,
.loading-overlay-leave-active {
  transition: all 0.3s ease;
}

.loading-overlay-enter-from,
.loading-overlay-leave-to {
  opacity: 0;
}

.loading-overlay-enter-from .loading-content,
.loading-overlay-leave-to .loading-content {
  transform: scale(0.9);
}

/* 스크롤바 스타일링 */
.loading-details::-webkit-scrollbar {
  width: 4px;
}

.loading-details::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.loading-details::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.loading-details::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 