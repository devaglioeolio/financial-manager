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
import { ref, onMounted, onUnmounted, computed } from 'vue'

// 반응형 데이터
const isExpanded = ref(false)
const isConnected = ref(false)
const isLoading = ref(false)
const error = ref(null)
const lastUpdate = ref(null)
const websocket = ref(null)

// 구독할 종목 리스트
const stockSymbols = [
  { key: 'DNASNVDA', symbol: 'NVDA', name: 'NVIDIA Corp' },
  { key: 'DNASCEG', symbol: 'CEG', name: 'Constellation Energy Corp' },
  { key: 'DNASGOOGL', symbol: 'GOOGL', name: 'Alphabet Inc' },
  { key: 'DNYSJPM', symbol: 'JPM', name: 'JPMorgan Chase & Co' },
  { key: 'DAMSGLD', symbol: 'GLD', name: 'Gold' },
  { key: 'DAMSSGOV', symbol: 'SGOV', name: 'SGOV' }
]

// 여러 종목 데이터를 저장할 배열
const stockDataList = ref([])

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

// 종목 키로 종목 정보 찾기
const findStockByKey = (key) => {
  return stockSymbols.find(stock => stock.key === key)
}

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
      
      // 모든 종목에 대해 구독 메시지 전송
      stockSymbols.forEach(stock => {
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
              tr_key: stock.key
            }
          }
        }
        
        console.log(`${stock.symbol} 종목 구독 메시지 전송:`, subscribeMessage)
        websocket.value.send(JSON.stringify(subscribeMessage))
      })
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
        // 첫 번째 필드에서 종목 키 추출 (파이프로 구분된 마지막 부분)
        const firstField = values[0] || ''
        const stockKey = firstField.includes('|') ? firstField.split('|').pop() : firstField
        
        const openPrice = parseFloat(values[8]) || 0    // 시가 (인덱스 8)
        const highPrice = parseFloat(values[9]) || 0    // 고가 (인덱스 9)
        const lowPrice = parseFloat(values[10]) || 0    // 저가 (인덱스 10)
        const currentPrice = parseFloat(values[11]) || 0 // 현재가 (인덱스 11)
        const changeSign = values[12] || '0'            // 대비구분 (인덱스 12)
        const change = parseFloat(values[13]) || 0      // 전일대비 (인덱스 13)
        const changePercent = parseFloat(values[14]) || 0 // 등락율 (인덱스 14)
        
        // 종목 키로 종목 정보 찾기
        const stockInfo = findStockByKey(stockKey)
        if (!stockInfo) {
          console.warn('알 수 없는 종목 키:', stockKey, '(원본 데이터:', firstField, ')')
          return
        }
        
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
        
        // 기존 종목 데이터 찾기 또는 새로 생성
        let existingStock = findStockDataBySymbol(stockInfo.symbol)
        
        if (existingStock) {
          // 기존 데이터 업데이트
          existingStock.currentPrice = currentPrice
          existingStock.change = adjustedChange
          existingStock.changePercent = adjustedChangePercent
          existingStock.highPrice = highPrice
          existingStock.lowPrice = lowPrice
          existingStock.prevClose = prevClose
        } else {
          // 새 종목 데이터 추가
          stockDataList.value.push({
            symbol: stockInfo.symbol,
            name: stockInfo.name,
            currentPrice: currentPrice,
            change: adjustedChange,
            changePercent: adjustedChangePercent,
            highPrice: highPrice,
            lowPrice: lowPrice,
            prevClose: prevClose
          })
        }
        
        console.log(`${stockInfo.symbol} 파싱된 주식 데이터:`, {
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
  stockDataList.value = [
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corp',
      currentPrice: 875.28,
      change: 12.45,
      changePercent: 1.44,
      highPrice: 880.50,
      lowPrice: 860.25,
      prevClose: 862.83
    },
    {
      symbol: 'CEG',
      name: 'Constellation Energy Corp',
      currentPrice: 245.67,
      change: -3.21,
      changePercent: -1.29,
      highPrice: 250.45,
      lowPrice: 242.10,
      prevClose: 248.88
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc',
      currentPrice: 178.24,
      change: 2.15,
      changePercent: 1.22,
      highPrice: 179.88,
      lowPrice: 175.67,
      prevClose: 176.09
    },
    {
      symbol: 'JPM',
      name: 'JPMorgan Chase & Co',
      currentPrice: 234.56,
      change: 4.32,
      changePercent: 1.88,
      highPrice: 236.78,
      lowPrice: 230.45,
      prevClose: 230.24
    }
  ]
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