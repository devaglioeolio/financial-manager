<template>
  <div class="kis-realtime-widget" :class="{ expanded: isExpanded }">
    <!-- 컴팩트 모드 -->
    <div class="widget-compact" @click="toggleExpanded" v-if="!isExpanded">
      <div class="compact-stocks">
        <div class="compact-stock" v-for="stock in stockDataList" :key="stock.symbol">
          <span class="stock-symbol">{{ stock.symbol }}</span>
          <span class="compact-price">${{ formatNumber(stock.currentPrice) }}</span>
          <div class="compact-change" :class="{ 'positive': stock.changePercent > 0, 'negative': stock.changePercent < 0 }">
            <span class="change-arrow">{{ stock.changePercent > 0 ? '▲' : stock.changePercent < 0 ? '▼' : '-' }}</span>
            <span class="change-text">{{ stock.changePercent > 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 확장 모드 -->
    <div class="widget-expanded" v-if="isExpanded">
      <div class="widget-header">
        <h3>실시간 해외주식</h3>
        <div class="header-actions">
          <div class="connection-status" :class="{ 'connected': isConnected, 'disconnected': !isConnected }">
            <span class="status-dot"></span>
            <span class="status-text">{{ isConnected ? '연결됨' : '연결 끊김' }}</span>
          </div>
          
           <button class="reconnect-btn" @click="reconnectWebSocket" :disabled="isConnected">
             <span>🔌</span>
           </button>
           <button class="close-btn" @click="toggleExpanded">✕</button>
        </div>
      </div>
      
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>실시간 데이터 연결 중...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <span class="error-icon">⚠️</span>
        <p>{{ error }}</p>
        <button class="retry-btn" @click="connectWebSocket">다시 시도</button>
      </div>
      
      <div v-else class="stocks-container">
        <div class="stock-details" v-for="stock in stockDataList" :key="stock.symbol">
          <div class="stock-header">
            <div class="stock-name">
              <h4>{{ stock.name }}</h4>
              <span class="stock-symbol">{{ stock.symbol }}</span>
            </div>
          </div>
          
          <div class="price-grid">
            <div class="price-item current-price">
              <span class="label">현재가</span>
              <span class="value main-price">${{ formatNumber(stock.currentPrice) }}</span>
              <div class="price-change" :class="{ 'positive': stock.changePercent > 0, 'negative': stock.changePercent < 0 }">
                <span class="change-amount">{{ stock.changePercent > 0 ? '+' : '' }}${{ formatNumber(Math.abs(stock.change)) }}</span>
                <span class="change-percent">({{ stock.changePercent > 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%)</span>
              </div>
            </div>
            
            <div class="price-item">
              <span class="label">고가</span>
              <span class="value">${{ formatNumber(stock.highPrice) }}</span>
            </div>
            
            <div class="price-item">
              <span class="label">저가</span>
              <span class="value">${{ formatNumber(stock.lowPrice) }}</span>
            </div>
            
            <div class="price-item">
              <span class="label">전일종가</span>
              <span class="value">${{ formatNumber(stock.prevClose) }}</span>
            </div>
          </div>
          
          <div class="realtime-indicator">
            <span class="pulse-dot"></span>
            <span class="realtime-text">실시간 지연체결가</span>
          </div>
        </div>
      </div>
      
      <div v-if="lastUpdate" class="update-info">
        <span class="update-time">
          마지막 업데이트: {{ formatUpdateTime(lastUpdate) }}
        </span>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWebSocketStockData } from '../composables/useWebSocketStockData.js'

// WebSocket 실시간 데이터 관리
const { 
  isConnected, 
  isConnecting, 
  lastUpdate,
  getAllStockPrices
} = useWebSocketStockData()

// 반응형 데이터
const isExpanded = ref(false)
const isLoading = ref(false)
const error = ref(null)

// 전역 실시간 데이터에서 주식 목록 가져오기
const stockDataList = computed(() => {
  const allPrices = getAllStockPrices.value
  return Object.values(allPrices)
})

// 심볼로 종목 데이터 찾기
const findStockDataBySymbol = (symbol) => {
  return stockDataList.value.find(stock => stock.symbol === symbol)
}

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

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

// 실시간 데이터 표시를 위한 간단한 헬퍼 함수들은 유지

// 더 이상 자체 WebSocket 관리나 초기 데이터 설정이 필요없음
// 전역 상태에서 실시간 데이터를 가져옴
</script>

<style scoped>
.kis-realtime-widget {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.kis-realtime-widget::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
  pointer-events: none;
}

.kis-realtime-widget.expanded {
  min-height: 600px;
}

/* 컴팩트 모드 */
.widget-compact {
  padding: 16px 20px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.widget-compact:hover {
  transform: translateY(-2px);
}

.compact-stocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.compact-stock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.stock-symbol {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.8;
}

.compact-price {
  font-size: 14px;
  font-weight: 700;
}

.compact-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
}

.compact-change.positive {
  color: #ef4444;
}

.compact-change.negative {
  color: #3b82f6;
}

.change-arrow {
  font-size: 8px;
}

/* 확장 모드 */
.widget-expanded {
  padding: 0;
  position: relative;
  z-index: 1;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.widget-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f87171;
}

.connection-status.connected .status-dot {
  background: #4ade80;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.reconnect-btn, .close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s ease;
}

.reconnect-btn:hover, .close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.reconnect-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 로딩/에러 상태 */
.loading-state, .error-state {
  padding: 40px 24px;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 24px;
  display: block;
  margin-bottom: 8px;
}

.retry-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 12px;
  transition: background-color 0.2s ease;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 다중 종목 컨테이너 */
.stocks-container {
  max-height: 500px;
  overflow-y: auto;
  padding: 0 4px;
}

.stocks-container::-webkit-scrollbar {
  width: 6px;
}

.stocks-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.stocks-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.stocks-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* 주식 데이터 */
.stock-details {
  padding: 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stock-details:last-child {
  border-bottom: none;
}

.stock-header {
  margin-bottom: 16px;
}

.stock-name h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.stock-symbol {
  font-size: 14px;
  opacity: 0.7;
  font-weight: 500;
}

.price-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.price-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.price-item.current-price {
  grid-column: 1 / -1;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  text-align: center;
}

.price-item .label {
  font-size: 11px;
  opacity: 0.7;
  font-weight: 500;
}

.price-item .value {
  font-size: 13px;
  font-weight: 600;
}

.main-price {
  font-size: 20px !important;
  font-weight: 700 !important;
  margin-bottom: 6px;
}

.price-change {
  display: flex;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
}

.price-change.positive {
  color: #ef4444;
}

.price-change.negative {
  color: #3b82f6;
}

.realtime-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 11px;
}

.pulse-dot {
  width: 5px;
  height: 5px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.update-info {
  padding: 12px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  opacity: 0.7;
  text-align: center;
}


</style> 