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
        <h3>자산 상세</h3>
        <div class="asset-list">
          <div v-for="category in categories" :key="category.category" class="category-section">
            <h4 class="category-title">{{ category.categoryName }}</h4>
            <div v-for="subCategory in category.subCategories" :key="subCategory.category" class="subcategory-section">
              <h5 class="subcategory-title">{{ subCategory.categoryName }}</h5>
              <div v-for="asset in subCategory.assets" :key="asset.id" class="asset-item-card">
                <div class="asset-info-row">
                  <span class="asset-name">{{ asset.name }}</span>
                  <span v-if="getActualQuantity(asset)" class="quantity-label">{{ formatNumberInt(getActualQuantity(asset)) }}주</span>
                </div>
                <div class="asset-amounts-block">
                  <div class="amounts-col">
                    <div class="asset-amount-row">
                      <span class="amount-krw">
                        ₩{{ formatNumberInt(subCategory.category === 'FOREIGN'
                          ? (asset.transactions && asset.transactions.length > 0
                            ? asset.transactions.reduce((sum, t) => sum + (t.amount * t.exchangeRate * (t.type === 'BUY' ? 1 : t.type === 'SELL' ? -1 : 0)), 0)
                            : 0)
                          : asset.amount
                        ) }}
                        <span v-if="subCategory.category === 'FOREIGN'" class="amount-usd-inline">
                          ( ${{ formatNumber(asset.amount) }} )
                        </span>
                      </span>
                    </div>
                  </div>
                  <span v-if="asset.averagePurchasePrice" class="purchase-price-inline">
                    평균매수가: ₩{{ formatNumber(asset.averagePurchasePrice) }}
                  </span>
                </div>
                <div v-if="getActualQuantity(asset)" class="quantity-subtext">
                  보유수량: {{ formatNumberInt(getActualQuantity(asset)) }}주
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
import { ref, onMounted } from 'vue'
import { Pie as PieChart } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import axios from 'axios'

ChartJS.register(ArcElement, Tooltip, Legend)

const totalAmount = ref(0)
const categories = ref([])
const pieChartData = ref({
  labels: [],
  datasets: [{
    data: [],
    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#E91E63', '#00BCD4', '#FF5722', '#795548']
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

const formatNumber = (number) => {
  return new Intl.NumberFormat('ko-KR').format(number)
}

const formatNumberInt = (number) => {
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(number)
}

// 실제 보유수량 계산 함수
const getActualQuantity = (asset) => {
  if (!asset.transactions || asset.transactions.length === 0) return 0;
  return asset.transactions.reduce((sum, t) => {
    if (t.type === 'BUY') return sum + t.quantity;
    if (t.type === 'SELL') return sum - t.quantity;
    return sum;
  }, 0);
}

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

onMounted(() => {
  fetchAssets()
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
  height: 400px;
}

/* 자산 상세 컨테이너만 높이 확장 */
.chart-container:nth-child(2) {
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
</style> 