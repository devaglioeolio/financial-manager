<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>자산 현황</h1>
      <div class="total-assets">
        <h2>총 자산</h2>
        <p class="amount">₩{{ formatNumberInt(totalAmount) }}</p>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="chart-container">
        <h3>자산 분포</h3>
        <PieChart :data="pieChartData" :options="chartOptions" />
      </div>
      
      <div class="chart-container">
        <div class="chart-header">
          <h3>자산 증감 현황</h3>
          <div class="chart-tabs">
            <button 
              :class="['tab-btn', { active: activeTab === 'monthly' }]"
              @click="activeTab = 'monthly'"
            >
              월별
            </button>
            <button 
              :class="['tab-btn', { active: activeTab === 'daily' }]"
              @click="activeTab = 'daily'"
            >
              일별
            </button>
          </div>
        </div>
        <div v-if="activeTab === 'daily'" class="daily-options-container">
          <div class="controls-wrapper">
            <div class="segment-control">
              <button 
                v-for="option in dayOptions" 
                :key="option.value"
                :class="['segment-btn', { active: selectedDays === option.value }]"
                @click="changeDays(option.value)"
              >
                {{ option.label }}
              </button>
              <div class="segment-indicator" :style="segmentIndicatorStyle"></div>
            </div>
            <button class="refresh-btn" @click="fetchDailyAssets" title="새로고침">
              ↻
            </button>
          </div>
        </div>
        <div class="chart-wrapper">
          <LineChart 
            :data="activeTab === 'monthly' ? monthlyChartData : dailyChartData" 
            :options="lineChartOptions" 
          />
        </div>
      </div>
      
      <div class="chart-container asset-detail-container">
        <h3>자산 상세</h3>
        <div class="asset-list">
          <div v-for="category in categories" :key="category.category" class="category-section">
            <h4 class="category-title">{{ category.categoryName }}</h4>
            <div v-for="subCategory in category.subCategories" :key="subCategory.category" class="subcategory-section">
              <h5 class="subcategory-title">{{ subCategory.categoryName }}</h5>
              <div v-for="asset in subCategory.assets" :key="asset.id" class="asset-item-card">
                <div class="asset-info-row">
                  <span class="asset-name">{{ asset.name }}</span>
                  <span v-if="asset.totalQuantity" class="quantity-label">{{ formatNumberInt(asset.totalQuantity) }}주</span>
                </div>
                <div class="asset-amounts-block">
                  <div class="amounts-col">
                    <div class="asset-amount-row">
                      <span class="amount-krw">
                        ₩{{ formatNumberInt(subCategory.category === 'FOREIGN'
                          ? asset.amountInKRW
                          : asset.amount
                        ) }}
                        <span v-if="subCategory.category === 'FOREIGN'" class="amount-usd-inline">
                          ( ${{ formatNumber(asset.amount) }} )
                        </span>
                      </span>
                    </div>
                  </div>
                  <span v-if="asset.averagePurchasePrice" class="purchase-price-inline">
                    평균매수가: ₩{{ formatNumberInt(subCategory.category === 'FOREIGN'
                      ? asset.averagePurchasePrice
                      : asset.averagePurchasePrice
                    ) }}
                    <span v-if="subCategory.category === 'FOREIGN'" class="purchase-price-usd-inline">
                      ( ${{ formatNumber(asset.averagePurchasePriceInOriginal) }} )
                    </span>
                  </span>
                </div>
                <div v-if="asset.totalQuantity" class="quantity-subtext">
                  보유수량: {{ formatNumberInt(asset.totalQuantity) }}주
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Pie as PieChart, Line as LineChart } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js'
import axios from 'axios'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement)

const totalAmount = ref(0)
const categories = ref([])
const activeTab = ref('monthly')
const selectedDays = ref(7)

const dayOptions = [
  { value: 7, label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' }
]

const pieChartData = ref({
  labels: [],
  datasets: [{
    data: [],
    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#E91E63', '#00BCD4', '#FF5722', '#795548']
  }]
})

const monthlyChartData = ref({
  labels: [],
  datasets: [{
    label: '총 자산',
    data: [],
    borderColor: '#2196F3',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    tension: 0.4,
    fill: true
  }]
})

const dailyChartData = ref({
  labels: [],
  datasets: [{
    label: '총 자산',
    data: [],
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    tension: 0.4,
    fill: true
  }]
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    }
  }
}

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 0,
  interaction: {
    intersect: false,
    mode: 'index'
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          return '총 자산: ₩' + formatNumberInt(context.parsed.y);
        }
      }
    }
  },
  scales: {
    x: {
      ticks: {
        maxTicksLimit: 8, // 최대 8개의 라벨만 표시
        autoSkip: true
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value) {
          return '₩' + formatNumberInt(value);
        }
      }
    }
  }
}

const formatNumber = (number) => {
  return new Intl.NumberFormat('ko-KR').format(number)
}

const formatNumberInt = (number) => {
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(number)
}

const changeDays = (days) => {
  selectedDays.value = days
  fetchDailyAssets()
}

// 세그먼트 인디케이터 위치 계산
const segmentIndicatorStyle = computed(() => {
  const index = dayOptions.findIndex(option => option.value === selectedDays.value)
  const width = 100 / dayOptions.length
  return {
    transform: `translateX(${index * 100}%)`,
    width: `${width}%`
  }
})


const fetchAssets = async () => {
  try {
    const response = await axios.get('/api/assets')
    const { totalAmount: total, categories: cats } = response.data
    
    totalAmount.value = total
    categories.value = cats

    // 파이 차트 데이터: 서브카테고리 기준
    const subCats = []
    cats.forEach(cat => {
      cat.subCategories.forEach(sub => {
        subCats.push(sub)
      })
    })
    pieChartData.value = {
      labels: subCats.map(sub => sub.categoryName),
      datasets: [{
        data: subCats.map(sub => sub.totalAmount),
        backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#E91E63', '#00BCD4', '#FF5722', '#795548']
      }]
    }
  } catch (error) {
    console.error('자산 데이터 조회 실패:', error)
  }
}

const fetchMonthlyAssets = async () => {
  try {
    const response = await axios.get('/api/assets/monthly')
    const { monthlyData } = response.data
    
    monthlyChartData.value = {
      labels: monthlyData.map(data => data.monthName),
      datasets: [{
        label: '총 자산',
        data: monthlyData.map(data => data.totalAmount),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.4,
        fill: true
      }]
    }
  } catch (error) {
    console.error('월별 자산 데이터 조회 실패:', error)
  }
}

const fetchDailyAssets = async () => {
  try {
    const response = await axios.get(`/api/assets/daily?days=${selectedDays.value}`)
    const { dailyData } = response.data
    
    dailyChartData.value = {
      labels: dailyData.map(data => data.dateDisplay),
      datasets: [{
        label: '총 자산',
        data: dailyData.map(data => data.totalAmount),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true
      }]
    }
  } catch (error) {
    console.error('일별 자산 데이터 조회 실패:', error)
  }
}

onMounted(() => {
  fetchAssets()
  fetchMonthlyAssets()
  fetchDailyAssets()
})
</script>

<style scoped>
.dashboard {
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.total-assets {
  margin-top: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.amount {
  font-size: 2.5rem;
  font-weight: bold;
  color: #2c3e50;
  margin-top: 0.5rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.chart-container {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  height: 450px;
  display: flex;
  flex-direction: column;
}

/* 자산 상세 컨테이너만 높이 확장 및 전체 너비 사용 */
.asset-detail-container {
  grid-column: 1 / -1;
  height: 700px;
}

.asset-list {
  margin-top: 1rem;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.category-section {
  margin-bottom: 1.5rem;
}

.category-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eee;
}

.subcategory-section {
  margin-left: 1rem;
  margin-bottom: 1rem;
}

.subcategory-title {
  font-size: 1rem;
  font-weight: 500;
  color: #666;
  margin-bottom: 0.5rem;
}

.asset-item-card {
  background: #f8fafd;
  border-radius: 12px;
  padding: 1em 1.2em;
  margin-bottom: 1em;
  box-shadow: 0 2px 8px rgba(33,150,243,0.06);
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.asset-info-row {
  display: flex;
  align-items: center;
  gap: 0.7em;
}

.asset-name {
  font-size: 1.15em;
  font-weight: 700;
  color: #1a237e;
  flex: 1;
  letter-spacing: 0.01em;
}

.quantity-label {
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 10px;
  padding: 0.1em 0.7em;
  font-size: 0.95em;
  font-weight: 600;
  margin-left: 0.5em;
}

.quantity-subtext {
  font-size: 0.92em;
  color: #888;
  margin-top: 0.1em;
  margin-left: 0.1em;
}

.asset-amounts-block {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 0.2em;
  margin-bottom: 0.2em;
}

.amounts-col {
  display: flex;
  flex-direction: column;
  gap: 0.1em;
}

.purchase-price-inline {
  font-size: 0.95em;
  color: #888;
  margin-left: 1em;
  white-space: nowrap;
  align-self: flex-end;
}

.amount-krw {
  color: #222;
  font-weight: 700;
  font-size: 1.15em;
}
.amount-usd-inline {
  color: #888;
  font-size: 0.98em;
  font-weight: 500;
  margin-left: 0.3em;
}

.purchase-price-usd-inline {
  color: #888;
  font-size: 0.98em;
  font-weight: 500;
  margin-left: 0.3em;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-tabs {
  display: flex;
  gap: 0.5rem;
}

.tab-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  border-color: #2196F3;
  color: #2196F3;
}

.tab-btn.active {
  background: #2196F3;
  border-color: #2196F3;
  color: white;
}

.chart-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
}

/* 일별 조회 옵션 스타일 */
.daily-options-container {
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.controls-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.refresh-btn {
  padding: 0.5rem 0.75rem;
  border: 2px solid #4CAF50;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1.1rem;
  color: #4CAF50;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.1);
}

.refresh-btn:hover {
  background: #4CAF50;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.2);
}

/* 세그먼트 컨트롤 */
.segment-control {
  position: relative;
  display: inline-flex;
  background: #e9ecef;
  border-radius: 12px;
  padding: 4px;
  overflow: hidden;
}

.segment-btn {
  position: relative;
  padding: 0.5rem 1.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
  transition: color 0.3s ease;
  z-index: 2;
}

.segment-btn.active {
  color: white;
}

.segment-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  bottom: 4px;
  background: #4CAF50;
  border-radius: 8px;
  transition: transform 0.3s ease;
  z-index: 1;
}
</style> 