<template>
  <div class="trend-analysis">
    <div class="trend-header">
      <h1>📈 트렌드 분석</h1>
      <p class="subtitle">구글 트렌드로 보는 보유 종목의 관심도 변화</p>
    </div>

    <div class="analysis-tabs">
      <button 
        :class="['tab-btn', { active: activeTab === 'my-stocks' }]"
        @click="activeTab = 'my-stocks'"
      >
        내 종목 분석
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'keyword-search' }]"
        @click="activeTab = 'keyword-search'"
      >
        키워드 검색
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'compare' }]"
        @click="activeTab = 'compare'"
      >
        키워드 비교
      </button>
    </div>

    <!-- 내 종목 분석 탭 -->
    <div v-if="activeTab === 'my-stocks'" class="tab-content">
      <div class="section-header">
        <h2>보유 종목 트렌드 분석</h2>
        <button 
          @click="analyzeMyStocks" 
          :disabled="loading"
          class="analyze-btn"
        >
          {{ loading ? '분석 중...' : '🔍 분석 시작' }}
        </button>
      </div>

      <div v-if="loading" class="loading-section">
        <div class="loading-spinner"></div>
        <p>보유 종목의 트렌드 데이터를 분석하고 있습니다...</p>
        <p class="loading-note">Google API 호출 제한으로 인해 시간이 소요될 수 있습니다.</p>
      </div>

      <div v-if="myStockAnalysis && !loading" class="analysis-results">
        <!-- 더미 데이터 알림 -->
        <div v-if="myStockAnalysis.isDummyData" class="dummy-data-notice">
          <div class="notice-icon">⚠️</div>
          <div class="notice-content">
            <h4>테스트 모드</h4>
            <p>현재 샘플 데이터로 분석 결과를 보여드리고 있습니다. 실제 보유 종목을 분석하려면 로그인해주세요.</p>
          </div>
        </div>
        
        <!-- 요약 정보 -->
        <div v-if="myStockAnalysis.summary" class="summary-cards">
          <div class="summary-card">
            <div class="summary-icon">📊</div>
            <div class="summary-info">
              <h3>분석 완료</h3>
              <p>{{ myStockAnalysis.summary.totalAnalyzed }}개 종목</p>
            </div>
          </div>
          <div class="summary-card rising">
            <div class="summary-icon">📈</div>
            <div class="summary-info">
              <h3>관심도 상승</h3>
              <p>{{ myStockAnalysis.summary.risingCount }}개 종목</p>
            </div>
          </div>
          <div class="summary-card falling">
            <div class="summary-icon">📉</div>
            <div class="summary-info">
              <h3>관심도 하락</h3>
              <p>{{ myStockAnalysis.summary.fallingCount }}개 종목</p>
            </div>
          </div>
          <div class="summary-card popular">
            <div class="summary-icon">🔥</div>
            <div class="summary-info">
              <h3>최고 관심도</h3>
              <p>{{ myStockAnalysis.summary.mostPopularStock.name }}</p>
            </div>
          </div>
        </div>

        <!-- 개별 종목 분석 -->
        <div class="stock-analyses">
          <div 
            v-for="analysis in myStockAnalysis.analyses" 
            :key="analysis.stockName"
            class="stock-analysis-card"
            :class="analysis.trendDirection"
          >
            <div class="stock-header">
              <h3>{{ analysis.stockName }}</h3>
              <div class="trend-badge" :class="analysis.trendDirection">
                <span v-if="analysis.trendDirection === 'rising'">📈 상승</span>
                <span v-else-if="analysis.trendDirection === 'falling'">📉 하락</span>
                <span v-else>📊 안정</span>
              </div>
            </div>

            <div class="trend-metrics">
              <div class="metric">
                <label>현재 관심도</label>
                <span class="value">{{ analysis.recentTrendAverage }}</span>
              </div>
              <div class="metric">
                <label>변화율</label>
                <span class="value" :class="{ 
                  positive: analysis.trendChangePercent > 0, 
                  negative: analysis.trendChangePercent < 0 
                }">
                  {{ analysis.trendChangePercent > 0 ? '+' : '' }}{{ analysis.trendChangePercent }}%
                </span>
              </div>
            </div>

            <!-- 관련 키워드 -->
            <div v-if="analysis.relatedKeywords && (analysis.relatedKeywords.rising.length > 0 || analysis.relatedKeywords.top.length > 0)" class="related-keywords">
              <h4>연관 검색어</h4>
              <div v-if="analysis.relatedKeywords.rising.length > 0" class="keyword-group">
                <label>🔥 급상승:</label>
                <div class="keywords">
                  <span 
                    v-for="keyword in analysis.relatedKeywords.rising.slice(0, 3)" 
                    :key="keyword.query"
                    class="keyword-tag rising"
                  >
                    {{ keyword.query }}
                  </span>
                </div>
              </div>
              <div v-if="analysis.relatedKeywords.top.length > 0" class="keyword-group">
                <label>🔝 인기:</label>
                <div class="keywords">
                  <span 
                    v-for="keyword in analysis.relatedKeywords.top.slice(0, 3)" 
                    :key="keyword.query"
                    class="keyword-tag"
                  >
                    {{ keyword.query }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 트렌드 차트 (간단한 스파크라인) -->
            <div class="trend-chart">
              <canvas 
                :ref="`chart-${analysis.stockName}`"
                width="300" 
                height="60"
                @click="showDetailChart(analysis)"
              ></canvas>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!loading && !myStockAnalysis" class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>트렌드 분석을 시작해보세요</h3>
        <p>보유 종목의 구글 트렌드 데이터를 분석하여<br>시장의 관심도 변화를 확인할 수 있습니다.</p>
      </div>
    </div>

    <!-- 키워드 검색 탭 -->
    <div v-if="activeTab === 'keyword-search'" class="tab-content">
      <div class="search-section">
        <h2>키워드 트렌드 검색</h2>
        <div class="search-form">
          <input 
            v-model="searchKeyword"
            @keyup.enter="searchKeywordTrend"
            placeholder="검색할 키워드를 입력하세요 (예: 삼성전자, 애플)"
            class="keyword-input"
          />
          <button 
            @click="searchKeywordTrend"
            :disabled="keywordLoading || !searchKeyword.trim()"
            class="search-btn"
          >
            {{ keywordLoading ? '검색 중...' : '🔍 검색' }}
          </button>
        </div>
      </div>

      <div v-if="keywordResult" class="keyword-result">
        <h3>{{ keywordResult.keyword }} 트렌드 분석</h3>
        
        <div class="trend-summary">
          <p>최근 1년간의 구글 검색 트렌드를 보여드립니다.</p>
          <small>생성일: {{ new Date(keywordResult.generatedAt).toLocaleString('ko-KR') }}</small>
        </div>

        <!-- 관련 키워드 -->
        <div v-if="keywordResult.relatedKeywords" class="related-section">
          <div v-if="keywordResult.relatedKeywords.rising.length > 0" class="related-group">
            <h4>🔥 급상승 검색어</h4>
            <div class="keywords">
              <span 
                v-for="keyword in keywordResult.relatedKeywords.rising" 
                :key="keyword.query"
                class="keyword-tag rising"
              >
                {{ keyword.query }}
              </span>
            </div>
          </div>
          
          <div v-if="keywordResult.relatedKeywords.top.length > 0" class="related-group">
            <h4>🔝 인기 검색어</h4>
            <div class="keywords">
              <span 
                v-for="keyword in keywordResult.relatedKeywords.top" 
                :key="keyword.query"
                class="keyword-tag"
              >
                {{ keyword.query }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 키워드 비교 탭 -->
    <div v-if="activeTab === 'compare'" class="tab-content">
      <div class="compare-section">
        <h2>키워드 비교 분석</h2>
        
        <div class="compare-form">
          <div class="keyword-inputs">
            <input 
              v-for="(keyword, index) in compareKeywords" 
              :key="index"
              v-model="compareKeywords[index]"
              :placeholder="`키워드 ${index + 1}`"
              class="keyword-input small"
            />
          </div>
          <button 
            @click="addKeywordInput"
            v-if="compareKeywords.length < 5"
            class="add-keyword-btn"
          >
            + 키워드 추가
          </button>
          <button 
            @click="compareKeywordTrends"
            :disabled="compareLoading || compareKeywords.filter(k => k.trim()).length < 2"
            class="compare-btn"
          >
            {{ compareLoading ? '비교 중...' : '📊 비교 분석' }}
          </button>
        </div>
      </div>

      <div v-if="compareResult" class="compare-result">
        <h3>키워드 비교 결과</h3>
        <div class="comparison-summary">
          <p>{{ compareResult.keywords.join(', ') }}의 구글 트렌드 비교</p>
          <small>생성일: {{ new Date(compareResult.generatedAt).toLocaleString('ko-KR') }}</small>
        </div>
        
        <div class="comparison-legend">
          <div 
            v-for="(keyword, index) in compareResult.keywords" 
            :key="keyword"
            class="legend-item"
          >
            <div class="legend-color" :style="{ backgroundColor: getChartColor(index) }"></div>
            <span>{{ keyword }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 상세 차트 모달 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedStock?.stockName }} 상세 트렌드</h3>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <canvas ref="modalChart" width="600" height="300"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, nextTick } from 'vue'

export default {
  name: 'TrendAnalysis',
  setup() {
    const activeTab = ref('my-stocks')
    const loading = ref(false)
    const keywordLoading = ref(false)
    const compareLoading = ref(false)
    
    const myStockAnalysis = ref(null)
    const keywordResult = ref(null)
    const compareResult = ref(null)
    
    const searchKeyword = ref('')
    const compareKeywords = ref(['', ''])
    
    const showModal = ref(false)
    const selectedStock = ref(null)

    // 내 종목 분석
    const analyzeMyStocks = async () => {
      loading.value = true
      try {
        console.log('트렌드 분석 요청 시작')
        
        const response = await fetch('http://localhost:5000/api/trends/user-stocks', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        console.log('응답 상태:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text()
          console.error('JSON이 아닌 응답:', text.substring(0, 200))
          throw new Error('서버에서 잘못된 응답 형식을 받았습니다.')
        }
        
        const data = await response.json()
        
        if (data.success) {
          myStockAnalysis.value = data.data
          
          if (data.data.isDummyData) {
            alert('테스트용 더미 데이터로 분석했습니다.\n실제 보유 종목을 분석하려면 로그인이 필요합니다.')
          } else if (data.data.analyzedStocks === 0) {
            alert('분석 가능한 종목이 없습니다. 주식 자산을 먼저 등록해주세요.')
          }
          
          // 다음 틱에서 차트 그리기
          await nextTick()
          drawSparklines()
        } else {
          console.error('분석 실패:', data.message)
          alert('분석 실패: ' + (data.message || '알 수 없는 오류'))
        }
      } catch (error) {
        console.error('API 호출 실패:', error)
        if (error.message.includes('Failed to fetch')) {
          alert('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
        } else if (error.message.includes('JSON')) {
          alert('서버 응답 형식 오류: ' + error.message)
        } else {
          alert('오류 발생: ' + error.message)
        }
      } finally {
        loading.value = false
      }
    }

    // 키워드 검색
    const searchKeywordTrend = async () => {
      if (!searchKeyword.value.trim()) return
      
      keywordLoading.value = true
      try {
        const response = await fetch(`http://localhost:5000/api/trends/keyword/${encodeURIComponent(searchKeyword.value)}`, {
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text()
          console.error('JSON이 아닌 응답:', text.substring(0, 200))
          throw new Error('서버에서 잘못된 응답 형식을 받았습니다.')
        }
        
        const data = await response.json()
        
        if (data.success) {
          keywordResult.value = data.data
          
          await nextTick()
          drawKeywordChart()
        } else {
          alert('검색 실패: ' + (data.message || '알 수 없는 오류'))
        }
      } catch (error) {
        console.error('키워드 검색 실패:', error)
        if (error.message.includes('Failed to fetch')) {
          alert('서버에 연결할 수 없습니다.')
        } else if (error.message.includes('JSON')) {
          alert('서버 응답 형식 오류: ' + error.message)
        } else {
          alert('검색 오류: ' + error.message)
        }
      } finally {
        keywordLoading.value = false
      }
    }

    // 키워드 비교
    const compareKeywordTrends = async () => {
      const keywords = compareKeywords.value.filter(k => k.trim())
      if (keywords.length < 2) return
      
      compareLoading.value = true
      try {
        const response = await fetch('http://localhost:5000/api/trends/compare', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ keywords })
        })
        const data = await response.json()
        
        if (data.success) {
          compareResult.value = data.data
          
          await nextTick()
          drawCompareChart()
        }
      } catch (error) {
        console.error('키워드 비교 실패:', error)
      } finally {
        compareLoading.value = false
      }
    }

    // 키워드 입력 필드 추가
    const addKeywordInput = () => {
      if (compareKeywords.value.length < 5) {
        compareKeywords.value.push('')
      }
    }

    // 스파크라인 차트 그리기
    const drawSparklines = () => {
      if (!myStockAnalysis.value?.analyses) return
      
      myStockAnalysis.value.analyses.forEach(analysis => {
        const canvas = document.querySelector(`canvas[ref="chart-${analysis.stockName}"]`)
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        const data = analysis.trendData.slice(-30) // 최근 30일
        
        drawSparkline(ctx, data, canvas.width, canvas.height)
      })
    }

    // 스파크라인 그리기 헬퍼
    const drawSparkline = (ctx, data, width, height) => {
      if (data.length === 0) return
      
      ctx.clearRect(0, 0, width, height)
      
      const maxValue = Math.max(...data.map(d => d.value))
      const minValue = Math.min(...data.map(d => d.value))
      const range = maxValue - minValue || 1
      
      ctx.strokeStyle = '#4f46e5'
      ctx.lineWidth = 2
      ctx.beginPath()
      
      data.forEach((point, index) => {
        const x = (index / (data.length - 1)) * width
        const y = height - ((point.value - minValue) / range) * height
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
    }

    // 키워드 차트 그리기
    const drawKeywordChart = () => {
      // 실제 구현시 Chart.js 등 라이브러리 사용
      console.log('키워드 차트 그리기:', keywordResult.value)
    }

    // 비교 차트 그리기
    const drawCompareChart = () => {
      // 실제 구현시 Chart.js 등 라이브러리 사용
      console.log('비교 차트 그리기:', compareResult.value)
    }

    // 차트 색상 가져오기
    const getChartColor = (index) => {
      const colors = ['#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
      return colors[index % colors.length]
    }

    // 상세 차트 모달
    const showDetailChart = (analysis) => {
      selectedStock.value = analysis
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      selectedStock.value = null
    }

    return {
      activeTab,
      loading,
      keywordLoading,
      compareLoading,
      myStockAnalysis,
      keywordResult,
      compareResult,
      searchKeyword,
      compareKeywords,
      showModal,
      selectedStock,
      analyzeMyStocks,
      searchKeywordTrend,
      compareKeywordTrends,
      addKeywordInput,
      showDetailChart,
      closeModal,
      getChartColor
    }
  }
}
</script>

<style scoped>
.trend-analysis {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.trend-header {
  text-align: center;
  margin-bottom: 2rem;
}

.trend-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #1a202c;
}

.subtitle {
  color: #6b7280;
  font-size: 1.1rem;
}

.analysis-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
  padding: 1rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}

.tab-content {
  min-height: 400px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.analyze-btn, .search-btn, .compare-btn {
  background: #4f46e5;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.analyze-btn:hover, .search-btn:hover, .compare-btn:hover {
  background: #4338ca;
}

.analyze-btn:disabled, .search-btn:disabled, .compare-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.loading-section {
  text-align: center;
  padding: 3rem;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-note {
  color: #6b7280;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.summary-card.rising {
  border-color: #10b981;
  background: #f0fdf4;
}

.summary-card.falling {
  border-color: #ef4444;
  background: #fef2f2;
}

.summary-card.popular {
  border-color: #f59e0b;
  background: #fffbeb;
}

.summary-icon {
  font-size: 2rem;
}

.summary-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: #374151;
}

.summary-info p {
  margin: 0;
  font-weight: 600;
  color: #1f2937;
}

.stock-analyses {
  display: grid;
  gap: 1.5rem;
}

.stock-analysis-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  transition: all 0.2s;
}

.stock-analysis-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stock-analysis-card.rising {
  border-left: 4px solid #10b981;
}

.stock-analysis-card.falling {
  border-left: 4px solid #ef4444;
}

.stock-analysis-card.stable {
  border-left: 4px solid #6b7280;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.stock-header h3 {
  margin: 0;
  color: #1f2937;
}

.trend-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.trend-badge.rising {
  background: #dcfce7;
  color: #166534;
}

.trend-badge.falling {
  background: #fee2e2;
  color: #991b1b;
}

.trend-badge.stable {
  background: #f3f4f6;
  color: #374151;
}

.trend-metrics {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric label {
  font-size: 0.875rem;
  color: #6b7280;
}

.metric .value {
  font-weight: 600;
  font-size: 1.125rem;
}

.metric .value.positive {
  color: #059669;
}

.metric .value.negative {
  color: #dc2626;
}

.related-keywords {
  margin: 1rem 0;
}

.related-keywords h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #374151;
}

.keyword-group {
  margin-bottom: 0.75rem;
}

.keyword-group label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
  display: block;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.keyword-tag {
  background: #f3f4f6;
  color: #374151;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.keyword-tag.rising {
  background: #fef3c7;
  color: #92400e;
}

.trend-chart {
  margin-top: 1rem;
  cursor: pointer;
}

.trend-chart canvas {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  width: 100%;
  height: 60px;
}

.search-form, .compare-form {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.keyword-input {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.keyword-input.small {
  min-width: 150px;
  flex: none;
}

.keyword-input:focus {
  outline: none;
  border-color: #4f46e5;
}

.keyword-inputs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.add-keyword-btn {
  background: #f3f4f6;
  color: #374151;
  border: 2px solid #e5e7eb;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.chart-container, .comparison-chart {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  margin: 1rem 0;
}

.comparison-legend {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.close-btn:hover {
  color: #374151;
}

.related-section {
  margin-top: 2rem;
}

.related-group {
  margin-bottom: 1.5rem;
}

.related-group h4 {
  margin: 0 0 0.75rem 0;
  color: #374151;
}

.dummy-data-notice {
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.notice-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.notice-content h4 {
  margin: 0 0 0.5rem 0;
  color: #92400e;
  font-size: 1.1rem;
}

.notice-content p {
  margin: 0;
  color: #78350f;
  font-size: 0.95rem;
  line-height: 1.5;
}
</style> 