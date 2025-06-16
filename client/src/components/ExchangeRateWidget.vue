<template>
  <div class="exchange-widget" :class="{ expanded: isExpanded }">
    <div class="widget-compact" @click="toggleExpanded" v-if="!isExpanded">
      <div class="compact-currency">
        <span class="currency-code">{{ currentRate.currency }}</span>
        <span class="compact-rate">₩{{ formatNumber(currentRate.rate) }}</span>
      </div>
      <div class="compact-change" :class="{ 'positive': currentRate.change > 0, 'negative': currentRate.change < 0 }">
        <span class="change-arrow">{{ currentRate.change > 0 ? '▲' : currentRate.change < 0 ? '▼' : '-' }}</span>
        <span class="change-text">{{ currentRate.changePercent > 0 ? '+' : '' }}{{ currentRate.changePercent.toFixed(2) }}%</span>
      </div>
    </div>
    
    <div class="widget-expanded" v-if="isExpanded">
      <div class="widget-header">
        <h3>환율 정보</h3>
        <div class="header-actions">
          <button class="refresh-btn" @click.stop="fetchExchangeRates" :disabled="effectiveLoading">
            <span :class="{ 'rotating': effectiveLoading }">↻</span>
          </button>
          <button class="close-btn" @click="toggleExpanded">✕</button>
        </div>
      </div>
      
      <div v-if="effectiveLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>환율 정보를 가져오는 중...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <span class="error-icon">⚠️</span>
        <p>환율 정보를 가져올 수 없습니다</p>
        <button class="retry-btn" @click="fetchExchangeRates">다시 시도</button>
      </div>
      
      <div v-else class="exchange-list">
        <div 
          v-for="rate in effectiveExchangeRates" 
          :key="rate.currency"
          class="exchange-item"
          :class="{ 'positive': rate.change > 0, 'negative': rate.change < 0 }"
        >
          <div class="currency-info">
            <div class="currency-symbol">{{ rate.currency }}</div>
            <div class="currency-name">{{ rate.currencyName }}</div>
          </div>
          
          <div class="rate-info">
            <div class="current-rate">
              ₩{{ formatNumber(rate.rate) }}
            </div>
            <div class="rate-change">
              <span class="change-amount">
                {{ rate.change > 0 ? '+' : '' }}{{ formatNumber(rate.change) }}
              </span>
              <span class="change-percent">
                ({{ rate.changePercent > 0 ? '+' : '' }}{{ rate.changePercent.toFixed(2) }}%)
              </span>
            </div>
          </div>
          
          <div class="change-indicator">
            <span v-if="rate.change > 0" class="arrow up">▲</span>
            <span v-else-if="rate.change < 0" class="arrow down">▼</span>
            <span v-else class="arrow neutral">-</span>
          </div>
        </div>
      </div>
      
      <div v-if="lastUpdate && !effectiveLoading" class="update-info">
        <span class="update-time">
          마지막 업데이트: {{ formatUpdateTime(lastUpdate) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import axios from 'axios'

// Props 정의
const props = defineProps({
  exchangeRates: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const localExchangeRates = ref([])
const localLoading = ref(false)
const error = ref(false)
const lastUpdate = ref(null)
const isExpanded = ref(false)
const currentIndex = ref(0)
let rotationInterval = null

// props가 있으면 props 사용, 없으면 로컬 데이터 사용
const effectiveExchangeRates = computed(() => {
  return props.exchangeRates.length > 0 ? props.exchangeRates : localExchangeRates.value
})

const effectiveLoading = computed(() => {
  return props.loading || localLoading.value
})

const currentRate = computed(() => {
  if (effectiveExchangeRates.value.length === 0) {
    return {
      currency: 'USD',
      rate: 0,
      change: 0,
      changePercent: 0
    }
  }
  return effectiveExchangeRates.value[currentIndex.value]
})

const formatNumber = (number) => {
  return new Intl.NumberFormat('ko-KR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(number)
}

const formatUpdateTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMinutes = Math.floor((now - date) / (1000 * 60))
  
  if (diffMinutes < 1) {
    return '방금 전'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  } else {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  if (!isExpanded.value) {
    startRotation()
  } else {
    stopRotation()
  }
}

const startRotation = () => {
  if (effectiveExchangeRates.value.length > 1) {
    rotationInterval = setInterval(() => {
      currentIndex.value = (currentIndex.value + 1) % effectiveExchangeRates.value.length
    }, 5000)
  }
}

const stopRotation = () => {
  if (rotationInterval) {
    clearInterval(rotationInterval)
    rotationInterval = null
  }
}

const fetchExchangeRates = async () => {
  localLoading.value = true
  error.value = false
  
  try {
    const response = await axios.get('/api/assets/exchange-rates')
    if (response.data.success) {
      localExchangeRates.value = response.data.data
      lastUpdate.value = response.data.lastUpdate
      if (!isExpanded.value) {
        startRotation()
      }
    } else {
      throw new Error('API 응답 오류')
    }
  } catch (err) {
    console.error('환율 정보 조회 실패:', err)
    error.value = true
  } finally {
    localLoading.value = false
  }
}

// Props 데이터 변경 감지
watch(() => props.exchangeRates, (newRates) => {
  if (newRates.length > 0 && !isExpanded.value) {
    stopRotation()
    startRotation()
  }
}, { immediate: true })

onMounted(() => {
  // 부모에서 로딩 중이면 기다리고, props가 없으면서 로딩도 아닐 때만 독립적으로 호출
  if (props.exchangeRates.length === 0 && !props.loading) {
    fetchExchangeRates()
  }
})

onUnmounted(() => {
  stopRotation()
})
</script>

<style scoped>
.exchange-widget {
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.exchange-widget.expanded {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1000;
  width: 300px;
  max-height: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.widget-compact {
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 160px;
  transition: all 0.3s ease;
}

.widget-compact:hover {
  background: #f8fafd;
  transform: translateY(-1px);
}

.compact-currency {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.currency-code {
  font-size: 0.85rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.1rem;
}

.compact-rate {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
}

.compact-change {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.75rem;
  font-weight: 600;
}

.compact-change.positive {
  color: #f44336;
}

.compact-change.negative {
  color: #2196F3;
}

.change-arrow {
  margin-bottom: 0.1rem;
}

.change-text {
  font-size: 0.7rem;
}

.widget-expanded {
  padding: 1rem;
  max-height: 380px;
  overflow: hidden;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.widget-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1rem;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.refresh-btn, .close-btn {
  background: none;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: #666;
  transition: all 0.3s ease;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover, .close-btn:hover {
  border-color: #2196F3;
  color: #2196F3;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-state, .error-state {
  text-align: center;
  padding: 1.5rem 1rem;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2196F3;
  border-radius: 50%;
  animation: rotate 1s linear infinite;
  margin: 0 auto 0.5rem;
}

.error-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.3s ease;
}

.retry-btn:hover {
  background: #1976D2;
}

.exchange-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
}

.exchange-item {
  display: flex;
  align-items: center;
  padding: 0.6rem;
  background: #f8fafd;
  border-radius: 8px;
  border-left: 3px solid #e0e0e0;
  transition: all 0.3s ease;
}

.exchange-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.exchange-item.positive {
  border-left-color: #f44336;
  background: rgba(244, 67, 54, 0.02);
}

.exchange-item.negative {
  border-left-color: #2196F3;
  background: rgba(33, 150, 243, 0.02);
}

.currency-info {
  flex: 1;
  min-width: 0;
}

.currency-symbol {
  font-size: 0.9rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.1rem;
}

.currency-name {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
}

.rate-info {
  flex: 2;
  text-align: right;
  margin-right: 0.5rem;
}

.current-rate {
  font-size: 0.9rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.1rem;
}

.rate-change {
  font-size: 0.75rem;
  font-weight: 500;
}

.positive .rate-change {
  color: #f44336;
}

.negative .rate-change {
  color: #2196F3;
}

.change-amount {
  margin-right: 0.2rem;
}

.change-indicator {
  display: flex;
  align-items: center;
}

.arrow {
  font-size: 0.8rem;
  font-weight: bold;
}

.arrow.up {
  color: #f44336;
}

.arrow.down {
  color: #2196F3;
}

.arrow.neutral {
  color: #999;
}

.update-info {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

.update-time {
  font-size: 0.7rem;
  color: #999;
  font-weight: 500;
}
</style> 