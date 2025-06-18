import { ref, computed } from 'vue'
import axios from 'axios'

// 전역 상태로 관리할 데이터
const realTimeStockPrices = ref(new Map()) // symbol -> price data
const isConnected = ref(false)
const isConnecting = ref(false)
const lastUpdate = ref(null)
const websocket = ref(null)
const userId = ref('')

// WebSocket 연결 설정
const WEBSOCKET_URL = 'ws://localhost:8080'

export function useWebSocketStockData() {
  
  // 사용자 정보 가져오기
  const fetchUserInfo = async () => {
    try {
      const response = await axios.get('/api/assets')
      if (response.data.success && response.data.userId) {
        userId.value = response.data.userId
        console.log('사용자 ID 설정됨:', userId.value)
        return true
      } else {
        const token = import.meta.env.VITE_TEMP_TOKEN
        if (token) {
          userId.value = '683eebf6104aaf427c37f0cf'
          console.log('기본 사용자 ID 사용:', userId.value)
          return true
        }
      }
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error)
      userId.value = '683eebf6104aaf427c37f0cf'
      console.log('에러로 인한 기본 사용자 ID 사용:', userId.value)
      return true
    }
    return false
  }

  // WebSocket 연결
  const connectWebSocket = async () => {
    if (isConnected.value || isConnecting.value) {
      console.log('이미 연결되어 있거나 연결 중입니다')
      return
    }

    // 사용자 ID가 없으면 먼저 가져오기
    if (!userId.value) {
      const userFetched = await fetchUserInfo()
      if (!userFetched) {
        console.error('사용자 정보를 가져올 수 없습니다')
        return
      }
    }

    isConnecting.value = true

    try {
      const wsUrl = `${WEBSOCKET_URL}?userId=${userId.value}`
      websocket.value = new WebSocket(wsUrl)

      websocket.value.onopen = () => {
        console.log('WebSocket 프록시 서버 연결 성공')
        isConnected.value = true
        isConnecting.value = false
      }

      websocket.value.onmessage = (event) => {
        try {
          const messageData = JSON.parse(event.data)
          
          if (messageData.type === 'stock_update') {
            updateStockPrice(messageData.data)
            lastUpdate.value = new Date().toISOString()
          }
        } catch (e) {
          console.error('WebSocket 데이터 파싱 오류:', e)
        }
      }

      websocket.value.onerror = (error) => {
        console.error('WebSocket 오류:', error)
        isConnected.value = false
        isConnecting.value = false
      }

      websocket.value.onclose = () => {
        console.log('WebSocket 연결 종료')
        isConnected.value = false
        isConnecting.value = false
      }

    } catch (error) {
      console.error('WebSocket 연결 실패:', error)
      isConnecting.value = false
    }
  }

  // 주식 가격 데이터 업데이트
  const updateStockPrice = (stockData) => {
    // 종목 키에서 심볼 추출 (예: DNASNVDA -> NVDA)
    const symbol = extractSymbolFromKey(stockData.symbol)
    
    realTimeStockPrices.value.set(symbol, {
      symbol: symbol,
      currentPrice: stockData.currentPrice,
      change: stockData.change,
      changePercent: stockData.changePercent,
      highPrice: stockData.highPrice,
      lowPrice: stockData.lowPrice,
      prevClose: stockData.prevClose,
      timestamp: stockData.timestamp
    })

    console.log(`실시간 가격 업데이트: ${symbol} = $${stockData.currentPrice}`)
  }

  // 종목 키에서 심볼 추출
  const extractSymbolFromKey = (key) => {
    const prefixes = ['DNAS', 'DNYS', 'DAMS', 'DTSE', 'DHKS', 'DSHS', 'DSZS']
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        return key.substring(prefix.length)
      }
    }
    return key
  }

  // 특정 심볼의 실시간 가격 가져오기
  const getStockPrice = (symbol) => {
    return realTimeStockPrices.value.get(symbol)
  }

  // 모든 실시간 가격 데이터 가져오기
  const getAllStockPrices = computed(() => {
    return Object.fromEntries(realTimeStockPrices.value)
  })

  // 자산 데이터에 실시간 가격 적용
  const applyRealTimePrices = (assets) => {
    if (!Array.isArray(assets)) return assets

    return assets.map(asset => {
      // ticker 또는 symbol로 실시간 가격 찾기
      const ticker = asset.symbol || asset.ticker
      if (!ticker) return asset

      const realTimeData = getStockPrice(ticker)
      if (!realTimeData) return asset

      // 실시간 데이터로 계산 업데이트
      const updatedAsset = { ...asset }
      updatedAsset.currentPrice = realTimeData.currentPrice
      updatedAsset.change = realTimeData.change
      updatedAsset.changePercent = realTimeData.changePercent

      // 현재가치 재계산 (수량 * 현재가)
      if (asset.quantity) {
        updatedAsset.currentValue = asset.quantity * realTimeData.currentPrice
      }

      // 평가손익 재계산 (현재가치 - 매수가치)
      if (asset.quantity && asset.avgPurchasePrice) {
        const purchaseValue = asset.quantity * asset.avgPurchasePrice
        updatedAsset.unrealizedGain = updatedAsset.currentValue - purchaseValue
        
        // 수익률 재계산
        if (purchaseValue > 0) {
          updatedAsset.returnRate = (updatedAsset.unrealizedGain / purchaseValue) * 100
        }
      }

      return updatedAsset
    })
  }

  // WebSocket 연결 해제
  const disconnectWebSocket = () => {
    if (websocket.value) {
      websocket.value.close()
      websocket.value = null
    }
    isConnected.value = false
    isConnecting.value = false
  }

  // 연결 재시도
  const reconnectWebSocket = () => {
    disconnectWebSocket()
    setTimeout(() => {
      connectWebSocket()
    }, 1000)
  }

  return {
    // 상태
    isConnected,
    isConnecting,
    lastUpdate,
    
    // 메서드
    connectWebSocket,
    disconnectWebSocket,
    reconnectWebSocket,
    getStockPrice,
    getAllStockPrices,
    applyRealTimePrices
  }
} 