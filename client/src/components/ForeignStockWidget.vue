<template>
  <div class="foreign-stock-widget">
    <div class="widget-header">
      <h3 class="widget-title">해외주식 실시간</h3>
      <div class="widget-controls">
        <button 
          @click="fetchStockData" 
          :disabled="effectiveLoading" 
          class="refresh-btn"
          :class="{ 'rotating': effectiveLoading }"
        >
          🔄
        </button>
      </div>
    </div>

    <div class="widget-content">
      <!-- 로딩 상태 -->
      <div v-if="effectiveLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>실시간 주가 조회 중...</p>
      </div>

      <!-- 에러 상태 -->
      <div v-else-if="error" class="error-state">
        <span class="error-icon">⚠️</span>
        <p>데이터 조회 실패</p>
        <button @click="fetchStockData" class="retry-btn">다시 시도</button>
      </div>

      <!-- 데이터가 없는 경우 -->
      <div v-else-if="effectiveStockData.length === 0" class="empty-state">
        <span class="empty-icon">📈</span>
        <p>보유 중인 해외주식이 없습니다</p>
      </div>

      <!-- 주식 목록 -->
      <div v-else class="stock-list">
        <div 
          v-for="stock in effectiveStockData" 
          :key="stock.assetId"
          class="stock-item"
          :class="{ 
            'profit': stock.returnRate > 0, 
            'loss': stock.returnRate < 0,
            'error': stock.error 
          }"
        >
          <!-- 에러가 있는 주식 -->
          <div v-if="stock.error" class="stock-error">
            <div class="stock-name">{{ stock.name }}</div>
            <div class="error-message">{{ stock.error }}</div>
          </div>

          <!-- 정상 주식 데이터 -->
          <div v-else class="stock-content">
            <div class="stock-header">
              <div class="stock-info">
                <div class="stock-name">{{ stock.name }}</div>
                <div class="stock-symbol">{{ stock.symbol }}</div>
              </div>
              <div class="stock-quantity">{{ formatNumber(stock.quantity) }}주</div>
            </div>

            <div class="price-section">
              <div class="current-price">
                <span class="price-label">현재가</span>
                <span class="price-value">${{ formatNumber(stock.currentPrice || 0) }}</span>
                <span class="price-change" :class="{ 'positive': (stock.changePercent || 0) > 0, 'negative': (stock.changePercent || 0) < 0 }">
                  {{ (stock.changePercent || 0) > 0 ? '+' : '' }}${{ formatNumber(Math.abs(stock.change || 0)) }}
                  ({{ (stock.changePercent || 0) > 0 ? '+' : '' }}{{ (stock.changePercent || 0).toFixed(2) }}%)
                </span>
              </div>

              <div class="avg-price">
                <span class="avg-label">평균매수가</span>
                <span class="avg-value">${{ formatNumber(stock.avgPurchasePrice || 0) }}</span>
              </div>
            </div>

            <div class="return-section">
              <div class="return-rate">
                <span class="return-label">수익률</span>
                <span class="return-value" :class="{ 'profit': (stock.returnRate || 0) > 0, 'loss': (stock.returnRate || 0) < 0 }">
                  {{ (stock.returnRate || 0) > 0 ? '+' : '' }}{{ (stock.returnRate || 0).toFixed(2) }}%
                </span>
              </div>

              <div class="return-amount">
                <span class="amount-label">평가손익</span>
                <span class="amount-value" :class="{ 'profit': (stock.unrealizedGain || 0) > 0, 'loss': (stock.unrealizedGain || 0) < 0 }">
                  {{ (stock.unrealizedGain || 0) > 0 ? '+' : '' }}${{ formatNumber(Math.abs(stock.unrealizedGain || 0)) }}
                </span>
              </div>
            </div>

            <div class="value-section">
              <div class="current-value">
                <span class="value-label">현재가치</span>
                <span class="value-amount">${{ formatNumber(stock.currentValue || 0) }}</span>
              </div>
            </div>
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
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'

// Props 정의
const props = defineProps({
  stockData: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const localStockData = ref([])
const localLoading = ref(false)
const error = ref(false)
const lastUpdate = ref(null)

// props가 있으면 props 사용, 없으면 로컬 데이터 사용
const effectiveStockData = computed(() => {
  return props.stockData.length > 0 ? props.stockData : localStockData.value
})

const effectiveLoading = computed(() => {
  return props.loading || localLoading.value
})

const formatNumber = (number) => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0.00'
  }
  return new Intl.NumberFormat('en-US', { 
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

const fetchStockData = async () => {
  localLoading.value = true
  error.value = false
  
  try {
    const response = await axios.get('/api/assets/foreign-stock-returns')
    if (response.data.success) {
      localStockData.value = response.data.data
      lastUpdate.value = response.data.lastUpdate
    } else {
      throw new Error('API 응답 오류')
    }
  } catch (err) {
    console.error('해외주식 데이터 조회 실패:', err)
    error.value = true
  } finally {
    localLoading.value = false
  }
}

onMounted(() => {
  // 부모에서 로딩 중이면 기다리고, props가 없으면서 로딩도 아닐 때만 독립적으로 호출
  if (props.stockData.length === 0 && !props.loading) {
    fetchStockData()
  }
})
</script>

<style scoped>
.foreign-stock-widget {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.widget-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.widget-controls {
  display: flex;
  gap: 0.5rem;
}

.refresh-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  padding: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: white;
  transition: all 0.3s ease;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover {
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
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

.widget-content {
  padding: 1rem;
}

.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: rotate 1s linear infinite;
  margin: 0 auto 0.5rem;
}

.error-icon, .empty-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.3s ease;
}

.retry-btn:hover {
  background: #5a6fd8;
}

.stock-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stock-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.3s ease;
}

.stock-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stock-item.profit {
  border-left: 4px solid #f44336;
  background: rgba(244, 67, 54, 0.02);
}

.stock-item.loss {
  border-left: 4px solid #2196F3;
  background: rgba(33, 150, 243, 0.02);
}

.stock-item.error {
  border-left: 4px solid #ff9800;
  background: rgba(255, 152, 0, 0.02);
}

.stock-error {
  text-align: center;
  color: #ff9800;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.stock-name {
  font-weight: 600;
  font-size: 1rem;
  color: #333;
}

.stock-symbol {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.2rem;
}

.stock-quantity {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

.price-section, .return-section, .value-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.current-price, .avg-price, .return-rate, .return-amount, .current-value {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.price-label, .avg-label, .return-label, .amount-label, .value-label {
  font-size: 0.75rem;
  color: #888;
  font-weight: 500;
}

.price-value, .avg-value, .return-value, .amount-value, .value-amount {
  font-weight: 600;
  font-size: 0.9rem;
}

.price-change {
  font-size: 0.8rem;
  font-weight: 500;
}

.positive {
  color: #f44336;
}

.negative {
  color: #2196F3;
}

.profit {
  color: #f44336;
}

.loss {
  color: #2196F3;
}

.update-info {
  text-align: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}

.update-time {
  font-size: 0.8rem;
  color: #888;
}

@media (max-width: 768px) {
  .stock-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .price-section, .return-section, .value-section {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
}
</style> 