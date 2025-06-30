import { ref, computed } from 'vue'

// 전역 로딩 상태들
const loadingStates = ref(new Map())

export function useLoading() {
  
  const setLoading = (key, isLoading) => {
    if (isLoading) {
      loadingStates.value.set(key, true)
    } else {
      loadingStates.value.delete(key)
    }
  }
  
  const isLoading = (key) => {
    return loadingStates.value.has(key)
  }
  
  const hasAnyLoading = computed(() => {
    return loadingStates.value.size > 0
  })
  
  const getLoadingKeys = computed(() => {
    return Array.from(loadingStates.value.keys())
  })
  
  const clearAllLoading = () => {
    loadingStates.value.clear()
  }
  
  // 비동기 함수를 래핑하여 자동으로 로딩 상태 관리
  const withLoading = async (key, asyncFn) => {
    setLoading(key, true)
    try {
      const result = await asyncFn()
      return result
    } finally {
      setLoading(key, false)
    }
  }
  
  // 여러 로딩 상태를 그룹으로 관리
  const createLoadingGroup = (groupKey) => {
    const groupStates = ref(new Set())
    
    const setGroupLoading = (itemKey, isLoading) => {
      const fullKey = `${groupKey}.${itemKey}`
      
      if (isLoading) {
        groupStates.value.add(itemKey)
        loadingStates.value.set(fullKey, true)
      } else {
        groupStates.value.delete(itemKey)
        loadingStates.value.delete(fullKey)
      }
    }
    
    const isGroupLoading = computed(() => {
      return groupStates.value.size > 0
    })
    
    const getGroupLoadingItems = computed(() => {
      return Array.from(groupStates.value)
    })
    
    return {
      setLoading: setGroupLoading,
      isLoading: isGroupLoading,
      loadingItems: getGroupLoadingItems
    }
  }
  
  return {
    setLoading,
    isLoading,
    hasAnyLoading,
    getLoadingKeys,
    clearAllLoading,
    withLoading,
    createLoadingGroup
  }
} 