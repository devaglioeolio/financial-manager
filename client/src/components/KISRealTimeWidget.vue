<template>
  <div class="kis-realtime-widget" :class="{ expanded: isExpanded }">
    <!-- 컴팩트 모드 -->
    <div class="widget-compact" @click="toggleExpanded" v-if="!isExpanded">
      <div class="compact-stock">
        <span class="stock-symbol">{{ stockData.symbol || 'NVDA' }}</span>
        <span class="compact-price">${{ formatNumber(stockData.currentPrice) }}</span>
      </div>
      <div class="compact-change" :class="{ 'positive': stockData.changePercent > 0, 'negative': stockData.changePercent < 0 }">
        <span class="change-arrow">{{ stockData.changePercent > 0 ? '▲' : stockData.changePercent < 0 ? '▼' : '-' }}</span>
        <span class="change-text">{{ stockData.changePercent > 0 ? '+' : '' }}{{ stockData.changePercent.toFixed(2) }}%</span>
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
      
      <div v-else class="stock-details">
        <div class="stock-header">
          <div class="stock-name">
            <h4>{{ stockData.name || 'NVIDIA Corp' }}</h4>
            <span class="stock-symbol">{{ stockData.symbol || 'NVDA' }}</span>
          </div>
        </div>
        
        <div class="price-grid">
          <div class="price-item current-price">
            <span class="label">현재가</span>
            <span class="value main-price">${{ formatNumber(stockData.currentPrice) }}</span>
            <div class="price-change" :class="{ 'positive': stockData.changePercent > 0, 'negative': stockData.changePercent < 0 }">
              <span class="change-amount">{{ stockData.changePercent > 0 ? '+' : '' }}${{ formatNumber(Math.abs(stockData.change)) }}</span>
              <span class="change-percent">({{ stockData.changePercent > 0 ? '+' : '' }}{{ stockData.changePercent.toFixed(2) }}%)</span>
            </div>
          </div>
          
          <div class="price-item">
            <span class="label">고가</span>
            <span class="value">${{ formatNumber(stockData.highPrice) }}</span>
          </div>
          
          <div class="price-item">
            <span class="label">저가</span>
            <span class="value">${{ formatNumber(stockData.lowPrice) }}</span>
          </div>
          
          <div class="price-item">
            <span class="label">전일종가</span>
            <span class="value">${{ formatNumber(stockData.prevClose) }}</span>
          </div>
        </div>
        
        <div class="realtime-indicator">
          <span class="pulse-dot"></span>
          <span class="realtime-text">실시간 지연체결가</span>
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
import { ref, onMounted, onUnmounted, computed } from 'vue'

// 반응형 데이터
const isExpanded = ref(false)
const isConnected = ref(false)
const isLoading = ref(false)
const error = ref(null)
const lastUpdate = ref(null)
const websocket = ref(null)

const stockData = ref({
  symbol: 'NVDA',
  name: 'NVIDIA Corp',
  currentPrice: 0,
  change: 0,
  changePercent: 0,
  highPrice: 0,
  lowPrice: 0,
  prevClose: 0
})

// WebSocket 연결 설정
const WEBSOCKET_URL = 'ws://ops.koreainvestment.com:21000'
// 환경변수와 로컬스토리지에서 API 키를 안전하게 가져오기
const getInitialApprovalKey = () => {
  try {
    return (import.meta.env?.VITE_KIS_TEMP_APPROVAL_KEY || localStorage.getItem('kisApprovalKey') || '')
  } catch (e) {
    console.warn('환경변수 또는 로컬스토리지 접근 실패:', e)
    return ''
  }
}

const approvalKey = ref(getInitialApprovalKey())



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
  if (isExpanded.value && !isConnected.value && approvalKey.value) {
    connectWebSocket()
  }
}



const connectWebSocket = () => {
  if (!approvalKey.value) {
    error.value = 'Approval Key가 설정되지 않았습니다. 소스코드에서 API 키를 설정해주세요.'
    return
  }

  isLoading.value = true
  error.value = null
  
  try {
    websocket.value = new WebSocket(WEBSOCKET_URL)
    
    websocket.value.onopen = () => {
      console.log('WebSocket 연결 성공')
      isConnected.value = true
      isLoading.value = false
      
      // 구독 메시지 전송
      const subscribeMessage = {
        header: {
          approval_key: approvalKey.value,
          custtype: "P",
          tr_type: "1",
          "content-type": "utf-8"
        },
        body: {
          input: {
            tr_id: "HDFSCNT0",
            tr_key: "DNASNVDA"  // NVIDIA 종목 코드
          }
        }
      }
      
      websocket.value.send(JSON.stringify(subscribeMessage))
    }
    
    websocket.value.onmessage = (event) => {
      try {
        // console.log('Raw WebSocket data:', event.data)
        
        // 한국투자증권 웹소켓 데이터는 JSON이 아니라 문자열로 옵니다
        // JSON 파싱을 시도하지 않고 바로 문자열로 처리
        let data = event.data
        
        parseStockData(data)
        lastUpdate.value = new Date().toISOString()
      } catch (e) {
        console.error('데이터 파싱 오류:', e)
        console.error('원본 데이터:', event.data)
      }
    }
    
    websocket.value.onerror = (error) => {
      console.error('WebSocket 오류:', error)
      isConnected.value = false
      isLoading.value = false
      error.value = 'WebSocket 연결 오류'
    }
    
    websocket.value.onclose = () => {
      console.log('WebSocket 연결 종료')
      isConnected.value = false
      isLoading.value = false
    }
    
  } catch (e) {
    console.error('WebSocket 연결 실패:', e)
    isLoading.value = false
    error.value = 'WebSocket 연결에 실패했습니다'
  }
}

const parseStockData = (data) => {
  try {
    
    // 한국투자증권 WebSocket 응답 데이터 파싱 (캐럿(^) 구분)
    if (typeof data === 'string' && data.includes('^')) {
      const values = data.split('^')
      
      // 한국투자증권 해외주식 실시간 데이터 필드 순서
      // "실시간종목코드|종목코드|수수점자리수|현지영업일자|현지일자|현지시간|한국일자|한국시간|시가|고가|저가|현재가|대비구분|전일대비|등락율|매수호가|매도호가|매수잔량|매도잔량|체결량|거래량|거래대금|매도체결량|매수체결량|체결강도|시장구분"
      
      if (values.length >= 15) {
        const openPrice = parseFloat(values[8]) || 0    // 시가 (인덱스 8)
        const highPrice = parseFloat(values[9]) || 0    // 고가 (인덱스 9)
        const lowPrice = parseFloat(values[10]) || 0    // 저가 (인덱스 10)
        const currentPrice = parseFloat(values[11]) || 0 // 현재가 (인덱스 11)
        const changeSign = values[12] || '0'            // 대비구분 (인덱스 12)
        const change = parseFloat(values[13]) || 0      // 전일대비 (인덱스 13)
        const changePercent = parseFloat(values[14]) || 0 // 등락율 (인덱스 14)
        
        // 전일종가 계산 (현재가 - 등락)
        const prevClose = currentPrice - change
        
        // 대비구분에 따라 등락 부호 조정 (1: 상승, 2: 보합, 3: 하락, 4: 상한가, 5: 하한가)
        let adjustedChange = change
        let adjustedChangePercent = changePercent
        
        if (changeSign === '3' || changeSign === '5') { // 하락 또는 하한가
          adjustedChange = -Math.abs(change)
          adjustedChangePercent = -Math.abs(changePercent)
        } else if (changeSign === '1' || changeSign === '4') { // 상승 또는 상한가
          adjustedChange = Math.abs(change)
          adjustedChangePercent = Math.abs(changePercent)
        }
        
        stockData.value.currentPrice = currentPrice
        stockData.value.change = adjustedChange
        stockData.value.changePercent = adjustedChangePercent
        stockData.value.highPrice = highPrice
        stockData.value.lowPrice = lowPrice
        stockData.value.prevClose = prevClose
        
        console.log('파싱된 주식 데이터:', {
          currentPrice,
          change: adjustedChange,
          changePercent: adjustedChangePercent,
          highPrice,
          lowPrice,
          prevClose,
          changeSign
        })
      }
    }

  } catch (e) {
    console.error('주식 데이터 파싱 오류:', e)
    console.error('파싱 실패 데이터:', data)
  }
}

const reconnectWebSocket = () => {
  if (websocket.value) {
    websocket.value.close()
  }
  setTimeout(() => {
    connectWebSocket()
  }, 1000)
}

const disconnectWebSocket = () => {
  if (websocket.value) {
    websocket.value.close()
    websocket.value = null
  }
  isConnected.value = false
}

onMounted(() => {
  // 초기 데이터 설정 (WebSocket 연결 전까지 표시할 데이터)
  stockData.value = {
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    currentPrice: 875.28,
    change: 12.45,
    changePercent: 1.44,
    highPrice: 880.50,
    lowPrice: 860.25,
    prevClose: 862.83
  }
})

onUnmounted(() => {
  disconnectWebSocket()
})
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
  min-height: 400px;
}

/* 컴팩트 모드 */
.widget-compact {
  padding: 16px 20px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s ease;
}

.widget-compact:hover {
  transform: translateY(-2px);
}

.compact-stock {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stock-symbol {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.8;
}

.compact-price {
  font-size: 18px;
  font-weight: 700;
}

.compact-change {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-size: 12px;
}

.compact-change.positive {
  color: #4ade80;
}

.compact-change.negative {
  color: #f87171;
}

.change-arrow {
  font-size: 10px;
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

/* 주식 데이터 */
.stock-details {
  padding: 20px 24px;
}

.stock-header {
  margin-bottom: 20px;
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
  gap: 16px;
  margin-bottom: 20px;
}

.price-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.price-item.current-price {
  grid-column: 1 / -1;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  text-align: center;
}

.price-item .label {
  font-size: 12px;
  opacity: 0.7;
  font-weight: 500;
}

.price-item .value {
  font-size: 14px;
  font-weight: 600;
}

.main-price {
  font-size: 24px !important;
  font-weight: 700 !important;
  margin-bottom: 8px;
}

.price-change {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
}

.price-change.positive {
  color: #4ade80;
}

.price-change.negative {
  color: #f87171;
}

.realtime-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 16px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
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