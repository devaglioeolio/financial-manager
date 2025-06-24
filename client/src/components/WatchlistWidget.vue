<template>
  <div class="watchlist-widget">
    <div class="widget-header">
      <h3>🌟 관심종목</h3>
      <button class="add-btn" @click="showSearchModal = true">+ 추가</button>
    </div>

    <!-- 관심종목 목록 -->
    <div class="watchlist-container">
      <div v-if="watchlist.length === 0" class="empty-state">
        <span class="empty-icon">📈</span>
        <p>관심종목을 추가해보세요</p>
        <button class="empty-add-btn" @click="showSearchModal = true">종목 추가하기</button>
      </div>

      <div v-else class="watchlist-items">
        <div 
          v-for="item in watchlistWithPrices" 
          :key="item._id || item.id"
          class="watchlist-item"
        >
          <div class="item-header">
            <div class="stock-info">
              <h4 class="stock-name">{{ item.englishName }}</h4>
              <span class="stock-ticker">{{ item.ticker }}</span>
              <span class="stock-market">{{ getMarketName(item.market) }}</span>
            </div>
            <button class="remove-btn" @click="removeFromWatchlist(item._id || item.id)" title="관심종목에서 제거">
              ✕
            </button>
          </div>

          <div class="price-info">
            <div class="current-price">
              <span class="price">${{ formatPrice(item.currentPrice) }}</span>
              <div v-if="item.change !== undefined" class="price-change" :class="getPriceChangeClass(item.change)">
                <span class="change-arrow">{{ item.change > 0 ? '▲' : item.change < 0 ? '▼' : '-' }}</span>
                <span class="change-amount">${{ formatPrice(Math.abs(item.change)) }}</span>
                <span class="change-percent">({{ item.changePercent > 0 ? '+' : '' }}{{ formatPercent(item.changePercent) }}%)</span>
              </div>
            </div>
            
            <div class="price-details">
              <div class="detail-item">
                <span class="label">고가</span>
                <span class="value">${{ formatPrice(item.highPrice) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">저가</span>
                <span class="value">${{ formatPrice(item.lowPrice) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">전일종가</span>
                <span class="value">${{ formatPrice(item.prevClose) }}</span>
              </div>
            </div>
          </div>

          <div class="realtime-status">
            <span v-if="item.isRealTime" class="realtime-indicator">
              <span class="pulse-dot"></span>
              실시간
            </span>
            <span v-else class="static-indicator">정적 데이터</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 종목 검색 모달 -->
    <div v-if="showSearchModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>종목 검색</h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>

        <div class="search-container">
          <div class="search-input-wrapper">
            <input 
              v-model="searchQuery" 
              @input="searchStocks"
              placeholder="티커명 또는 회사명을 입력하세요 (예: AAPL, Apple)"
              class="search-input"
              autocomplete="off"
            />
            <span v-if="searchLoading" class="search-loading">🔍</span>
          </div>

          <div v-if="searchResults.length > 0" class="search-results">
            <div 
              v-for="stock in searchResults" 
              :key="`${stock.market}-${stock.ticker}`"
              class="search-result-item"
              @click="addToWatchlist(stock)"
              :class="{ disabled: isInWatchlist(stock) }"
            >
              <div class="result-info">
                <h4 class="result-name">{{ stock.englishName }}</h4>
                <div class="result-details">
                  <span class="result-ticker">{{ stock.ticker }}</span>
                  <span class="result-market">{{ getMarketName(stock.market) }}</span>
                </div>
              </div>
              <div class="result-action">
                <span v-if="isInWatchlist(stock)" class="already-added">✓ 추가됨</span>
                <button v-else class="add-result-btn">+ 추가</button>
              </div>
            </div>
          </div>

          <div v-else-if="searchQuery && !searchLoading" class="no-results">
            <span class="no-results-icon">🔍</span>
            <p>검색 결과가 없습니다</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useWebSocketStockData } from '../composables/useWebSocketStockData.js'
import axios from 'axios'

// WebSocket 실시간 데이터
const { getAllStockPrices } = useWebSocketStockData()

// 반응형 데이터
const watchlist = ref([])
const showSearchModal = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const loading = ref(false)

// 검색 디바운스를 위한 타이머
let searchTimer = null

// 관심종목과 실시간 가격 데이터 결합
const watchlistWithPrices = computed(() => {
  const allPrices = getAllStockPrices.value
  console.log('📊 실시간 가격 데이터 키들:', Object.keys(allPrices))
  
  return watchlist.value.map(item => {
    // WebSocket에서는 심볼만 키로 사용 (prefix 제거된 상태)
    const ticker = item.ticker
    const realTimeData = allPrices[ticker]
    
    console.log(`🔍 ${item.ticker} 심볼 매칭:`, {
      ticker: ticker,
      market: item.market,
      hasRealTimeData: !!realTimeData,
      realTimePrice: realTimeData?.currentPrice,
      availableKeys: Object.keys(allPrices)
    })
    
    return {
      ...item,
      currentPrice: realTimeData?.currentPrice || 0,
      change: realTimeData?.change || 0,
      changePercent: realTimeData?.changePercent || 0,
      highPrice: realTimeData?.highPrice || 0,
      lowPrice: realTimeData?.lowPrice || 0,
      prevClose: realTimeData?.prevClose || 0,
      isRealTime: !!realTimeData
    }
  })
})



// 시장명 변환
const getMarketName = (market) => {
  const marketNames = {
    'NAS': 'NASDAQ',
    'NYS': 'NYSE', 
    'AMS': 'AMEX'
  }
  return marketNames[market] || market
}

// 가격 변동 클래스
const getPriceChangeClass = (change) => {
  if (change > 0) return 'positive'
  if (change < 0) return 'negative'
  return 'neutral'
}

// 숫자 포맷팅
const formatPrice = (price) => {
  if (price === null || price === undefined || isNaN(price)) return '0.00'
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(price)
}

const formatPercent = (percent) => {
  if (percent === null || percent === undefined || isNaN(percent)) return '0.00'
  return Math.abs(percent).toFixed(2)
}

// 종목 검색
const searchStocks = () => {
  if (searchTimer) clearTimeout(searchTimer)
  
  searchTimer = setTimeout(async () => {
    if (!searchQuery.value.trim()) {
      searchResults.value = []
      return
    }

    if (searchQuery.value.trim().length < 1) return

    searchLoading.value = true
    try {
      const response = await axios.get('/api/stock-codes/search', {
        params: {
          query: searchQuery.value.trim(),
          limit: 20
        }
      })
      
      if (response.data.success) {
        searchResults.value = response.data.data
      }
    } catch (error) {
      console.error('종목 검색 실패:', error)
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }, 300)
}

// 관심종목에 추가
const addToWatchlist = async (stock) => {
  if (isInWatchlist(stock)) return

  try {
    const response = await axios.post('/api/watchlist', {
      market: stock.market,
      ticker: stock.ticker,
      englishName: stock.englishName,
      koreanName: stock.koreanName
    })

    if (response.data.success) {
      await loadWatchlist()
      closeModal()
    }
  } catch (error) {
    console.error('관심종목 추가 실패:', error)
    alert('관심종목 추가에 실패했습니다.')
  }
}

// 관심종목에서 제거
const removeFromWatchlist = async (id) => {
  if (!confirm('이 종목을 관심종목에서 제거하시겠습니까?')) return

  try {
    const response = await axios.delete(`/api/watchlist/${id}`)
    
    if (response.data.success) {
      await loadWatchlist()
    }
  } catch (error) {
    console.error('관심종목 제거 실패:', error)
    alert('관심종목 제거에 실패했습니다.')
  }
}

// 이미 관심종목에 있는지 확인
const isInWatchlist = (stock) => {
  return watchlist.value.some(item => 
    item.market === stock.market && item.ticker === stock.ticker
  )
}

// 관심종목 목록 로드
const loadWatchlist = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/watchlist')
    if (response.data.success) {
      watchlist.value = response.data.data
    }
  } catch (error) {
    console.error('관심종목 로드 실패:', error)
  } finally {
    loading.value = false
  }
}

// 모달 닫기
const closeModal = () => {
  showSearchModal.value = false
  searchQuery.value = ''
  searchResults.value = []
}

// 컴포넌트 마운트시 관심종목 로드
onMounted(() => {
  loadWatchlist()
})
</script>

<style scoped>
.watchlist-widget {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  height: 450px;
  display: flex;
  flex-direction: column;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 15px;
}

.widget-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.add-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

/* 빈 상태 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  opacity: 0.8;
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 15px;
}

.empty-add-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  margin-top: 15px;
  transition: all 0.2s ease;
}

.empty-add-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 관심종목 컨테이너 */
.watchlist-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 관심종목 항목 */
.watchlist-items {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

/* 스크롤바 스타일링 */
.watchlist-items::-webkit-scrollbar {
  width: 6px;
}

.watchlist-items::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.watchlist-items::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.watchlist-items::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.watchlist-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.stock-info h4 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.stock-ticker {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 8px;
}

.stock-market {
  font-size: 0.8rem;
  opacity: 0.8;
}

.remove-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: rgba(255, 100, 100, 0.6);
}

/* 가격 정보 */
.price-info {
  margin-bottom: 10px;
}

.current-price {
  margin-bottom: 8px;
}

.price {
  font-size: 1.3rem;
  font-weight: 700;
  margin-right: 10px;
}

.price-change {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
}

.price-change.positive {
  color: #4ade80;
}

.price-change.negative {
  color: #f87171;
}

.price-change.neutral {
  color: #9ca3af;
}

.change-arrow {
  font-size: 0.8rem;
}

.price-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
}

.detail-item .label {
  opacity: 0.7;
  margin-bottom: 2px;
}

.detail-item .value {
  font-weight: 600;
}

/* 실시간 상태 */
.realtime-status {
  display: flex;
  justify-content: flex-end;
}

.realtime-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  color: #4ade80;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.static-indicator {
  font-size: 0.8rem;
  opacity: 0.6;
}

/* 모달 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  color: #333;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
}

.search-container {
  padding: 20px;
}

.search-input-wrapper {
  position: relative;
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.search-loading {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: translateY(-50%) rotate(0deg); }
  to { transform: translateY(-50%) rotate(360deg); }
}

/* 검색 결과 */
.search-results {
  max-height: 300px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 8px;
}

.search-result-item:hover:not(.disabled) {
  background: #f3f4f6;
}

.search-result-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-info h4 {
  margin: 0 0 4px 0;
  font-size: 1rem;
  color: #333;
}

.result-details {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
  color: #666;
}

.result-ticker {
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.add-result-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background-color 0.2s ease;
}

.add-result-btn:hover {
  background: #5a67d8;
}

.already-added {
  color: #10b981;
  font-size: 0.8rem;
  font-weight: 600;
}

.no-results {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.no-results-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 10px;
}
</style> 