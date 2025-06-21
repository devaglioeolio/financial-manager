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
      <!-- 총 합계 요약 -->
      <div v-if="!effectiveLoading && effectiveStockData.length > 0" class="portfolio-summary">
        <div class="summary-item">
          <span class="summary-label">총 투자금액</span>
          <span class="summary-value">${{ formatNumber(totalInvestment) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">총 현재가치</span>
          <span class="summary-value">${{ formatNumber(totalCurrentValue) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">총 수익</span>
          <span class="summary-value" :class="getSummaryColorClass(totalGain)">
            {{ totalGain > 0 ? '+' : '' }}${{ formatNumber(Math.abs(totalGain)) }}
          </span>
        </div>
        <div class="summary-item">
          <span class="summary-label">총 수익률</span>
          <span class="summary-value" :class="getSummaryColorClass(totalGain)">
            {{ totalGain > 0 ? '+' : '' }}{{ totalReturnRate.toFixed(2) }}%
          </span>
        </div>
      </div>

      <!-- 분포 차트 -->
      <div v-if="!effectiveLoading && effectiveStockData.length > 0" class="distribution-chart">
        <h4 class="chart-title">포트폴리오 분포</h4>
        <div class="chart-container">
          <canvas ref="chartCanvas" width="200" height="200"></canvas>
        </div>
        <div class="chart-legend">
          <div 
            v-for="(item, index) in chartData" 
            :key="item.name"
            class="legend-item"
          >
            <div 
              class="legend-color" 
              :style="{ backgroundColor: item.color }"
            ></div>
            <span class="legend-name">{{ item.name }}</span>
            <span class="legend-percent">{{ item.percentage.toFixed(1) }}%</span>
          </div>
        </div>
      </div>

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
          :class="getStockColorClass(stock.returnRate)"
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
                <span class="return-value" :class="getReturnColorClass(stock.returnRate || 0)">
                  {{ (stock.returnRate || 0) > 0 ? '+' : '' }}{{ (stock.returnRate || 0).toFixed(2) }}%
                </span>
              </div>

              <div class="return-amount">
                <span class="amount-label">평가손익</span>
                <span class="amount-value" :class="getReturnColorClass(stock.unrealizedGain || 0)">
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
import { ref, onMounted, computed, watch, nextTick } from 'vue'
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
const chartCanvas = ref(null)

// props가 있으면 props 사용, 없으면 로컬 데이터 사용
const effectiveStockData = computed(() => {
  return props.stockData.length > 0 ? props.stockData : localStockData.value
})

const effectiveLoading = computed(() => {
  return props.loading || localLoading.value
})

// 총 합계 계산
const totalCurrentValue = computed(() => {
  return effectiveStockData.value.reduce((sum, stock) => {
    return sum + (stock.currentValue || 0)
  }, 0)
})

const totalInvestment = computed(() => {
  return effectiveStockData.value.reduce((sum, stock) => {
    return sum + ((stock.currentValue || 0) - (stock.unrealizedGain || 0))
  }, 0)
})

const totalGain = computed(() => {
  return effectiveStockData.value.reduce((sum, stock) => {
    return sum + (stock.unrealizedGain || 0)
  }, 0)
})

const totalReturnRate = computed(() => {
  if (totalInvestment.value === 0) return 0
  return (totalGain.value / totalInvestment.value) * 100
})

// 차트 데이터
const chartData = computed(() => {
  if (effectiveStockData.value.length === 0) return []
  
  return effectiveStockData.value.map((stock, index) => ({
    name: stock.name,
    value: stock.currentValue || 0,
    percentage: ((stock.currentValue || 0) / totalCurrentValue.value) * 100,
    color: getChartColor(index)
  })).sort((a, b) => b.value - a.value)
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

// 수익률 기반 색상 클래스 (세분화)
const getReturnColorClass = (value) => {
  if (value >= 5) return 'profit-high'
  if (value > 0) return 'profit-low'
  if (value >= -5) return 'loss-low'
  return 'loss-high'
}

const getStockColorClass = (returnRate) => {
  if (returnRate >= 5) return 'stock-profit-high'
  if (returnRate > 0) return 'stock-profit-low'
  if (returnRate >= -5) return 'stock-loss-low'
  if (returnRate < -5) return 'stock-loss-high'
  return ''
}

const getSummaryColorClass = (value) => {
  return value > 0 ? 'summary-profit' : value < 0 ? 'summary-loss' : ''
}

// 차트 색상 생성
const getChartColor = (index) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471'
  ]
  return colors[index % colors.length]
}

// 도넛 차트 그리기
const drawChart = () => {
  if (!chartCanvas.value || chartData.value.length === 0) return
  
  const canvas = chartCanvas.value
  const ctx = canvas.getContext('2d')
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const radius = 80
  const innerRadius = 45
  
  // 캔버스 클리어
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  let currentAngle = -Math.PI / 2 // 12시 방향부터 시작
  
  chartData.value.forEach(item => {
    const sliceAngle = (item.percentage / 100) * 2 * Math.PI
    
    // 바깥쪽 원호
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
    ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true)
    ctx.closePath()
    ctx.fillStyle = item.color
    ctx.fill()
    
    currentAngle += sliceAngle
  })
}

const fetchStockData = async () => {
  localLoading.value = true
  error.value = false
  
  try {
    const response = await axios.get('/api/assets/foreign-stock-returns')
    if (response.data.success) {
      localStockData.value = response.data.data
      lastUpdate.value = response.data.lastUpdate
      await nextTick()
      drawChart()
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

// 데이터 변경 시 차트 다시 그리기
watch(effectiveStockData, async () => {
  await nextTick()
  drawChart()
}, { deep: true })

onMounted(() => {
  // 부모에서 로딩 중이면 기다리고, props가 없으면서 로딩도 아닐 때만 독립적으로 호출
  if (props.stockData.length === 0 && !props.loading) {
    fetchStockData()
  } else if (props.stockData.length > 0) {
    nextTick(() => drawChart())
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

/* 총 합계 요약 스타일 */
.portfolio-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid #e8eaff;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.summary-label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.summary-value {
  font-size: 1rem;  
  font-weight: 700;
  color: #333;
}

.summary-profit {
  color: #e53e3e !important;
}

.summary-loss {
  color: #3182ce !important;
}

/* 분포 차트 스타일 */
.distribution-chart {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #fafbff;
  border-radius: 8px;
  border: 1px solid #f0f2ff;
}

.chart-title {
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.chart-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-name {
  flex: 1;
  color: #333;
}

.legend-percent {
  color: #666;
  font-weight: 600;
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

/* 강화된 수익률 색상 */
.stock-profit-high {
  border-left: 4px solid #e53e3e;
  background: rgba(229, 62, 62, 0.03);
}

.stock-profit-low {
  border-left: 4px solid #fc8181;
  background: rgba(252, 129, 129, 0.02);
}

.stock-loss-low {
  border-left: 4px solid #63b3ed;
  background: rgba(99, 179, 237, 0.02);
}

.stock-loss-high {
  border-left: 4px solid #3182ce;
  background: rgba(49, 130, 206, 0.03);
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
  color: #e53e3e;
}

.negative {
  color: #3182ce;
}

/* 세분화된 수익률 색상 */
.profit-high {
  color: #e53e3e;
  font-weight: 700;
}

.profit-low {
  color: #fc8181;
  font-weight: 600;
}

.loss-low {
  color: #63b3ed;
  font-weight: 600;
}

.loss-high {
  color: #3182ce;
  font-weight: 700;
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
  .portfolio-summary {
    grid-template-columns: 1fr;
    gap: 0.8rem;
  }
  
  .stock-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .price-section, .return-section, .value-section {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
  
  .chart-legend {
    font-size: 0.75rem;
  }
}
</style> 