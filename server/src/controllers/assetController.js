const Asset = require('../models/Asset');
const { getExchangeRatesWithChange, initializeExchangeRates, forceRefreshExchangeRates } = require('../services/exchangeRateService');
const { calculateForeignStockReturns } = require('./koreaInvController');

// 자산 목록 조회
exports.getAssets = async (req, res) => {
  try {
    const allAssets = await Asset.find({ userId: req.user.id });
    
    // 수량이 0인 주식/암호화폐 자산은 제외 (다른 자산은 그대로 유지)
    const assets = allAssets.filter(asset => {
      if (asset.mainCategory === 'STOCK' || asset.mainCategory === 'CRYPTO') {
        return asset.totalQuantity > 0;
      }
      return true; // 주식/암호화폐가 아닌 경우는 그대로 포함
    });
    
    // 메인 카테고리별로 자산 그룹화
    const groupedAssets = assets.reduce((acc, asset) => {
      const mainCategory = asset.mainCategory;
      const subCategory = asset.subCategory;
      
      if (!acc[mainCategory]) {
        acc[mainCategory] = {
          category: mainCategory,
          categoryName: Asset.mainCategoryNames[mainCategory],
          totalAmount: 0,
          subCategories: {}
        };
      }

      if (!acc[mainCategory].subCategories[subCategory]) {
        acc[mainCategory].subCategories[subCategory] = {
          category: subCategory,
          categoryName: Asset.subCategoryNames[subCategory],
          totalAmount: 0,
          assets: []
        };
      }
      
      // 기본 자산 정보
      const assetInfo = {
        id: asset._id,
        name: asset.name,
        amount: asset.amount,
        currency: asset.currency,
        transactions: asset.transactions,
        details: asset.details
      };

      // 해외주식인 경우 ticker 정보 추가
      if (mainCategory === 'STOCK' && subCategory === 'FOREIGN' && asset.details) {
        const ticker = asset.details?.get ? asset.details.get('ticker') : asset.details.ticker;
        if (ticker) {
          assetInfo.ticker = ticker;
        }
      }

      // STOCK과 CRYPTO만 평균 매수가와 totalQuantity 포함
      if (mainCategory === 'STOCK' || mainCategory === 'CRYPTO') {
        // 원화 기준 평균매수가
        assetInfo.averagePurchasePrice = asset.getAveragePurchasePrice();
        assetInfo.totalQuantity = asset.totalQuantity;
        
        // FOREIGN 카테고리인 경우 원래 통화의 평균매수가 추가
        if (subCategory === 'FOREIGN') {
          assetInfo.averagePurchasePriceInOriginal = asset.getAveragePurchasePriceInOriginal();
          assetInfo.amountInKRW = asset.getAmountInKRW();
        }
      }

      acc[mainCategory].subCategories[subCategory].assets.push(assetInfo);
      
      // totalAmount 계산 (원화 기준)
      let assetTotal = subCategory === 'FOREIGN' ? asset.getAmountInKRW() : asset.amount;

      acc[mainCategory].totalAmount += assetTotal;
      acc[mainCategory].subCategories[subCategory].totalAmount += assetTotal;
      
      return acc;
    }, {});

    // 전체 자산 합계 계산
    const totalAmount = Object.values(groupedAssets).reduce(
      (sum, category) => sum + category.totalAmount, 
      0
    );

    // 응답 형식 변환
    const formattedResponse = {
      totalAmount,
      categories: Object.values(groupedAssets).map(category => ({
        ...category,
        subCategories: Object.values(category.subCategories)
      }))
    };

    res.json(formattedResponse);
  } catch (error) {
    console.error('자산 조회 에러:', error);
    res.status(500).json({ 
      message: '자산 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
};

// 자산 추가
exports.addAsset = async (req, res) => {
  try {
    const { 
      name, 
      mainCategory, 
      subCategory, 
      amount, 
      price, 
      quantity,
      currency = 'KRW',
      exchangeRate,
      details = {} 
    } = req.body;

    // 외화 자산인 경우 exchangeRate 필수
    if (currency !== 'KRW' && !exchangeRate) {
      return res.status(400).json({ 
        message: '외화 자산의 경우 환율(exchangeRate)이 필수입니다.' 
      });
    }

    const assetData = {
      userId: req.user.id,
      name,
      mainCategory: mainCategory.toUpperCase(),
      subCategory: subCategory.toUpperCase(),
      amount,
      currency,
      exchangeRate,
      details
    };

    // STOCK과 CRYPTO는 quantity(수량)가 필수
    if (assetData.mainCategory === 'STOCK' || assetData.mainCategory === 'CRYPTO') {
      if (!quantity) {
        return res.status(400).json({ message: '주식과 암호화폐는 수량(quantity)이 필요합니다.' });
      }
      if (!amount && !price) {
        return res.status(400).json({ message: '주식과 암호화폐는 총액(amount) 또는 단가(price)가 필요합니다.' });
      }

      // amount나 price 중 하나를 사용하여 총액 계산
      const totalAmount = amount || (quantity * price);
      
      assetData.amount = totalAmount;
      assetData.totalQuantity = quantity;  // totalQuantity 설정
      assetData.transactions = [{
        type: 'BUY',
        quantity,
        amount: totalAmount,
        price: price || (totalAmount / quantity),
        exchangeRate: exchangeRate || 1,
        date: new Date()
      }];
    } else {
      // 다른 자산은 amount만 사용
      if (!amount) {
        return res.status(400).json({ message: '금액(amount)이 필요합니다.' });
      }
      assetData.amount = amount;
    }

    const asset = new Asset(assetData);
    await asset.save();

    res.status(201).json({
      message: '자산이 추가되었습니다.',
      asset
    });
  } catch (error) {
    console.error('자산 추가 에러:', error);
    res.status(500).json({ 
      message: '자산 추가 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
};

// 자산 거래 추가 (매수/매도)
exports.addTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, quantity, amount, price, exchangeRate } = req.body;

    const asset = await Asset.findOne({ _id: id, userId: req.user.id });
    if (!asset) {
      return res.status(404).json({ message: '자산을 찾을 수 없습니다.' });
    }

    // STOCK과 CRYPTO 카테고리만 거래내역 추가 가능
    if (asset.mainCategory !== 'STOCK' && asset.mainCategory !== 'CRYPTO') {
      return res.status(400).json({ 
        message: '주식과 암호화폐 자산에만 거래내역을 추가할 수 있습니다.' 
      });
    }

    if (!quantity) {
      return res.status(400).json({ message: '수량(quantity)이 필요합니다.' });
    }
    if (!amount && !price) {
      return res.status(400).json({ message: '총액(amount) 또는 단가(price)가 필요합니다.' });
    }

    // 외화 자산인 경우 exchangeRate 필수
    if (asset.currency !== 'KRW' && !exchangeRate) {
      return res.status(400).json({ 
        message: '외화 자산의 경우 환율(exchangeRate)이 필수입니다.' 
      });
    }

    // 거래 금액 계산
    const transactionAmount = amount || (quantity * price);
    const transactionPrice = price || (transactionAmount / quantity);

    // 매도 시 보유 수량 체크
    if (type.toUpperCase() === 'SELL' && asset.totalQuantity < quantity) {
      return res.status(400).json({ message: '보유 수량보다 많은 수량을 매도할 수 없습니다.' });
    }

    // 거래 추가
    asset.transactions.push({
      type: type.toUpperCase(),
      quantity,
      amount: transactionAmount,
      price: transactionPrice,
      exchangeRate: exchangeRate || 1,
      date: new Date()
    });

    // 보유 수량과 총액 업데이트
    if (type.toUpperCase() === 'BUY') {
      asset.amount += transactionAmount;
      asset.totalQuantity += quantity;
    } else if (type.toUpperCase() === 'SELL') {
      // 매도할 때는 평균 매수가 기준으로 해당 수량만큼의 원본 투자금액을 빼기
      const averageCostPerShare = asset.amount / asset.totalQuantity;
      const originalInvestment = quantity * averageCostPerShare;
      
      asset.amount -= originalInvestment;
      asset.totalQuantity -= quantity;
      
      // 수량이 0이 되면 자산을 완전히 삭제 (거래 기록도 함께)
      if (asset.totalQuantity <= 0) {
        await Asset.findByIdAndDelete(asset._id);
        return res.json({
          message: '모든 수량이 매도되어 자산이 삭제되었습니다.',
          deleted: true
        });
      }
    }

    await asset.save();

    res.json({
      message: '거래가 추가되었습니다.',
      asset
    });
  } catch (error) {
    console.error('거래 추가 에러:', error);
    res.status(500).json({ 
      message: '거래 추가 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
};

// 자산 수정
exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, details } = req.body;

    const asset = await Asset.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { name, details },
      { new: true }
    );

    if (!asset) {
      return res.status(404).json({ message: '자산을 찾을 수 없습니다.' });
    }

    res.json({
      message: '자산이 수정되었습니다.',
      asset
    });
  } catch (error) {
    console.error('자산 수정 에러:', error);
    res.status(500).json({ 
      message: '자산 수정 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
};

// 자산 삭제
exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findOneAndDelete({ 
      _id: id, 
      userId: req.user.id 
    });

    if (!asset) {
      return res.status(404).json({ message: '자산을 찾을 수 없습니다.' });
    }

    res.json({ message: '자산이 삭제되었습니다.' });
  } catch (error) {
    console.error('자산 삭제 에러:', error);
    res.status(500).json({ 
      message: '자산 삭제 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
};

// 월별 자산 현황 조회
exports.getMonthlyAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ userId: req.user.id });
    
    // 현재 날짜부터 과거 6개월 데이터 생성
    const monthlyData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      // 더 안전한 날짜 생성 방식
      const targetDate = new Date(now);
      targetDate.setMonth(now.getMonth() - i);
      targetDate.setDate(1);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextMonth = new Date(targetDate);
      nextMonth.setMonth(targetDate.getMonth() + 1);
      
      let monthlyTotal = 0;
      
      assets.forEach(asset => {
        // 자산 생성일이 해당 월보다 이전인 경우만 계산
        if (asset.createdAt <= nextMonth) {
          // 해당 월까지의 거래만 고려하여 자산 가치 계산
          let assetValue = 0;
          let quantity = 0;
          
          if (asset.mainCategory === 'STOCK' || asset.mainCategory === 'CRYPTO') {
            // 주식/코인은 거래 내역 기반으로 계산
            asset.transactions.forEach(transaction => {
              if (transaction.date <= nextMonth) {
                if (transaction.type === 'BUY') {
                  assetValue += transaction.amount;
                  quantity += transaction.quantity;
                } else if (transaction.type === 'SELL') {
                  // 비례적으로 감소
                  const ratio = transaction.quantity / quantity;
                  assetValue -= assetValue * ratio;
                  quantity -= transaction.quantity;
                }
              }
            });
          } else {
            // 다른 자산은 단순히 현재 값 사용
            assetValue = asset.amount;
          }
          
          // 외화 자산인 경우 원화로 환산
          if (asset.subCategory === 'FOREIGN') {
            // 가장 최근 환율 사용 (실제로는 해당 시점의 환율을 사용해야 함)
            const latestTransaction = asset.transactions[asset.transactions.length - 1];
            const exchangeRate = latestTransaction ? latestTransaction.exchangeRate : 1;
            assetValue = assetValue * exchangeRate;
          }
          
          monthlyTotal += assetValue;
        }
      });
      
      // 일관된 날짜 정보 생성
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
      
      // month 필드도 동일한 방식으로 생성
      const monthString = `${year}-${month.toString().padStart(2, '0')}`;
      
      monthlyData.push({
        month: monthString,
        monthName: `${year}년 ${monthNames[month - 1]}`,
        totalAmount: Math.round(monthlyTotal)
      });
    }
    
    res.json({
      monthlyData,
      currentTotal: monthlyData[monthlyData.length - 1]?.totalAmount || 0
    });
  } catch (error) {
    console.error('월별 자산 현황 조회 에러:', error);
    res.status(500).json({ 
      message: '월별 자산 현황 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
};

// 일별 자산 현황 조회
exports.getDailyAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ userId: req.user.id });
    
    // 쿼리 파라미터에서 일자 수 가져오기 (기본값: 7일)
    const days = parseInt(req.query.days) || 7;
    
    // 최대 90일로 제한
    const maxDays = Math.min(days, 90);
    
    const dailyData = [];
    const now = new Date();
    
    for (let i = maxDays - 1; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - i);
      targetDate.setHours(23, 59, 59, 999); // 해당 일의 마지막 시점
      
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0); // 다음 날의 시작
      
      let dailyTotal = 0;
      
      assets.forEach(asset => {
        // 자산 생성일이 해당 일보다 이전인 경우만 계산
        if (asset.createdAt <= nextDay) {
          // 해당 일까지의 거래만 고려하여 자산 가치 계산
          let assetValue = 0;
          let quantity = 0;
          
          if (asset.mainCategory === 'STOCK' || asset.mainCategory === 'CRYPTO') {
            // 주식/코인은 거래 내역 기반으로 계산
            asset.transactions.forEach(transaction => {
              if (transaction.date <= nextDay) {
                if (transaction.type === 'BUY') {
                  assetValue += transaction.amount;
                  quantity += transaction.quantity;
                } else if (transaction.type === 'SELL') {
                  // 비례적으로 감소
                  if (quantity > 0) {
                    const ratio = transaction.quantity / quantity;
                    assetValue -= assetValue * ratio;
                    quantity -= transaction.quantity;
                  }
                }
              }
            });
          } else {
            // 다른 자산은 단순히 현재 값 사용
            assetValue = asset.amount;
          }
          
          // 외화 자산인 경우 원화로 환산
          if (asset.subCategory === 'FOREIGN') {
            // 가장 최근 환율 사용 (실제로는 해당 시점의 환율을 사용해야 함)
            const latestTransaction = asset.transactions[asset.transactions.length - 1];
            const exchangeRate = latestTransaction ? latestTransaction.exchangeRate : 1;
            assetValue = assetValue * exchangeRate;
          }
          
          dailyTotal += assetValue;
        }
      });
      
      // 일자 표시 직접 매핑
      const month = targetDate.getMonth() + 1;
      const day = targetDate.getDate();
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      const weekday = weekdays[targetDate.getDay()];
      
      dailyData.push({
        date: targetDate.toISOString().substring(0, 10), // YYYY-MM-DD 형식
        dateDisplay: `${month}/${day}(${weekday})`,
        totalAmount: Math.round(dailyTotal)
      });
    }
    
    res.json({
      dailyData,
      currentTotal: dailyData[dailyData.length - 1]?.totalAmount || 0
    });
  } catch (error) {
    console.error('일별 자산 현황 조회 에러:', error);
    res.status(500).json({ 
      message: '일별 자산 현황 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
};

// 최근 거래 내역 조회 
//MARK: 전체 거래내역 조회는는 비효율적으로 보이니 추후 수정필요
exports.getRecentTransactions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // 기본 10개
    const assets = await Asset.find({ userId: req.user.id });
    
    // 모든 자산의 거래 내역을 하나의 배열로 합치기
    const allTransactions = [];
    
    assets.forEach(asset => {
      asset.transactions.forEach(transaction => {
        allTransactions.push({
          _id: transaction._id,
          assetName: asset.name,
          assetId: asset._id,
          mainCategory: asset.mainCategory,
          subCategory: asset.subCategory,
          type: transaction.type,
          quantity: transaction.quantity,
          amount: transaction.amount,
          price: transaction.price,
          exchangeRate: transaction.exchangeRate,
          date: transaction.date,
          currency: asset.currency
        });
      });
    });
    
    // 날짜순으로 정렬 (최신순)
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 제한된 개수만 반환
    const recentTransactions = allTransactions.slice(0, limit);
    
    res.json({
      transactions: recentTransactions,
      total: allTransactions.length
    });
  } catch (error) {
    console.error('최근 거래 내역 조회 에러:', error);
    res.status(500).json({ 
      message: '최근 거래 내역 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
};

// 환율 정보 조회
exports.getExchangeRates = async (req, res) => {
  try {
    const exchangeRates = await getExchangeRatesWithChange();
    
    if (exchangeRates.length === 0) {
      return res.status(404).json({
        success: false,
        message: '저장된 환율 데이터가 없습니다.'
      });
    }

    res.json({
      success: true,
      data: exchangeRates,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('환율 정보 조회 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '환율 정보 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
};

// 환율 데이터 초기화 (개발용)
exports.initializeExchangeRates = async (req, res) => {
  try {
    const results = await initializeExchangeRates();

    res.json({
      success: true,
      message: '환율 초기 데이터 저장이 완료되었습니다.',
      data: results
    });

  } catch (error) {
    console.error('환율 데이터 초기화 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '환율 데이터 초기화 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
};

// 환율 강제 새로고침 (위젯에서 사용)
exports.refreshExchangeRates = async (req, res) => {
  try {
    console.log('환율 강제 새로고침 요청 받음...');
    
    const result = await forceRefreshExchangeRates();
    
    // API 호출이 실패해도 기존 데이터를 반환하므로 상태 코드는 200
    res.json({
      success: result.success,
      message: result.message,
      data: result.data,
      lastUpdate: result.lastUpdate,
      apiError: result.apiError || null,
      isFromCache: !result.success // API 실패 시 캐시된 데이터임을 표시
    });

  } catch (error) {
    console.error('환율 강제 새로고침 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '환율 강제 새로고침 중 심각한 오류가 발생했습니다.',
      error: error.message,
      data: []
    });
  }
};

// 해외주식 실시간 수익률 조회
exports.getForeignStockReturns = async (req, res) => {
  try {
    console.log('해외주식 실시간 수익률 조회 시작...');
    
    // 사용자의 모든 자산 조회
    const assets = await Asset.find({ userId: req.user.id });
    
    // 해외주식 실시간 수익률 계산 (한국투자증권 API 사용)
    const stockReturns = await calculateForeignStockReturns(assets, "realtime");
    
    console.log(`해외주식 수익률 계산 완료: ${stockReturns.length}개 종목`);
    
    res.json({
      success: true,
      data: stockReturns,
      count: stockReturns.length,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('해외주식 수익률 조회 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '해외주식 수익률 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
}; 