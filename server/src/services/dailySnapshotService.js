const Asset = require('../models/Asset');
const DailyAssetSnapshot = require('../models/DailyAssetSnapshot');
const User = require('../models/User');
const ExchangeRate = require('../models/ExchangeRate');
const { getExchangeRatesWithChange } = require('./exchangeRateService');
const { calculateStockReturns } = require('./stockPriceService');

/**
 * 특정 날짜의 환율 정보를 가져옵니다
 */
const getExchangeRatesForDate = async (targetDate) => {
  try {
    // YYYY-MM-DD 형식을 YYYYMMDD 형식으로 변환
    const formattedDate = targetDate.replace(/-/g, '');
    
    const exchangeRates = await ExchangeRate.find({ date: formattedDate });
    
    if (exchangeRates.length === 0) {
      console.warn(`No exchange rates found for ${formattedDate} (${targetDate}), using default rates`);
      return { USD: 1300, EUR: 1400, JPY: 9, CNY: 180 };
    }

    const rateMap = {};
    exchangeRates.forEach(rate => {
      rateMap[rate.curUnit] = rate.dealBasR;
    });

    console.log(`Found exchange rates for ${formattedDate}: USD=${rateMap.USD}, EUR=${rateMap.EUR}, JPY=${rateMap.JPY}, CNY=${rateMap.CNY}`);

    // 기본값으로 fallback 추가
    return {
      USD: rateMap.USD || 1300,
      EUR: rateMap.EUR || 1400,  
      JPY: rateMap.JPY || 9,
      CNY: rateMap.CNY || 180
    };
  } catch (error) {
    console.error(`Error fetching exchange rates for ${targetDate}:`, error);
    return { USD: 1300, EUR: 1400, JPY: 9, CNY: 180 };
  }
};

/**
 * 특정 날짜의 자산 스냅샷을 생성합니다
 */
const createDailySnapshot = async (userId, targetDate, useRealTimeData = false) => {
  try {
    console.log(`Creating snapshot for user ${userId} on ${targetDate} (realTime: ${useRealTimeData})`);
    
    // 해당 날짜 이전의 자산들을 조회
    const targetDateTime = new Date(targetDate + 'T23:59:59.999Z');
    const assets = await Asset.find({ 
      userId: userId,
      createdAt: { $lte: targetDateTime }
    });

    if (assets.length === 0) {
      console.log(`No assets found for user ${userId} on ${targetDate}`);
      return null;
    }

    // 환율 정보 가져오기
    let exchangeRateMap = {};
    if (useRealTimeData) {
      try {
        const exchangeRates = await getExchangeRatesWithChange();
        exchangeRates.forEach(rate => {
          exchangeRateMap[rate.currency] = rate.rate;
        });
      } catch (error) {
        console.warn('실시간 환율 정보 조회 실패, 해당 날짜 환율 사용:', error.message);
        exchangeRateMap = await getExchangeRatesForDate(targetDate);
      }
    } else {
      // 히스토리 데이터의 경우 해당 날짜의 실제 환율 사용
      exchangeRateMap = await getExchangeRatesForDate(targetDate);
    }

    // 해외주식 가격 정보 - 오늘만 실시간 조회, 과거는 기존 데이터 사용
    let stockPriceMap = {};
    const stockPrices = [];
    
    if (useRealTimeData) {
      try {
        const foreignStockReturns = await calculateStockReturns(assets);
        foreignStockReturns.forEach(stock => {
          if (!stock.error) {
            stockPriceMap[stock.assetId.toString()] = stock;
            stockPrices.push({
              assetId: stock.assetId,
              symbol: stock.symbol,
              priceUSD: stock.currentPrice
            });
          }
        });
      } catch (error) {
        console.warn('주식 가격 정보 조회 실패, 기존 데이터 사용:', error.message);
      }
    }

    // 자산을 카테고리별로 그룹화하고 실시간 가격 적용
    const groupedAssets = {};
    let totalAssetKRW = 0;

    assets.forEach(asset => {
      const mainCategory = asset.mainCategory;
      const subCategory = asset.subCategory;
      
      if (!groupedAssets[mainCategory]) {
        groupedAssets[mainCategory] = {
          mainCategory: mainCategory,
          categoryName: Asset.mainCategoryNames[mainCategory],
          totalAmountKRW: 0,
          subCategories: {}
        };
      }

      if (!groupedAssets[mainCategory].subCategories[subCategory]) {
        groupedAssets[mainCategory].subCategories[subCategory] = {
          subCategory: subCategory,
          categoryName: Asset.subCategoryNames[subCategory],
          totalAmountKRW: 0,
          assets: []
        };
      }

      // 자산 가치 계산
      let assetValueKRW = 0;
      let currentPriceUSD = null;
      let exchangeRateUSD = null;
      let avgPurchasePriceUSD = null;

      if (subCategory === 'FOREIGN' && asset.totalQuantity) {
        // 해외주식인 경우
        const stockData = stockPriceMap[asset._id.toString()];
        const usdRate = exchangeRateMap['USD'] || 1300; // fallback
        
        if (stockData) {
          currentPriceUSD = stockData.currentPrice;
          avgPurchasePriceUSD = stockData.avgPurchasePrice;
          exchangeRateUSD = usdRate;
          assetValueKRW = asset.totalQuantity * stockData.currentPrice * usdRate;
        } else {
          // 주식 데이터가 없는 경우 - asset.amount를 USD 총액으로 사용
          if (asset.amount && asset.totalQuantity > 0) {
            const avgPrice = asset.amount / asset.totalQuantity; // USD 단가 계산
            currentPriceUSD = avgPrice;
            avgPurchasePriceUSD = avgPrice;
            exchangeRateUSD = usdRate;
            assetValueKRW = asset.amount * usdRate; // USD 총액 * 환율
          } else {
            assetValueKRW = 0;
          }
        }
      } else if (subCategory === 'FOREIGN') {
        // 해외자산이지만 주식이 아닌 경우
        const rate = exchangeRateMap[asset.currency] || exchangeRateMap['USD'] || 1300;
        assetValueKRW = (asset.amount || 0) * rate;
        if (asset.currency === 'USD') {
          exchangeRateUSD = rate;
        }
      } else {
        // 국내자산
        assetValueKRW = asset.amount || 0;
      }

      // NaN 체크 및 기본값 설정
      if (isNaN(assetValueKRW) || !isFinite(assetValueKRW)) {
        console.warn(`Invalid assetValueKRW for ${asset.name}:`, assetValueKRW);
        assetValueKRW = 0;
      }

      groupedAssets[mainCategory].totalAmountKRW += assetValueKRW;
      groupedAssets[mainCategory].subCategories[subCategory].totalAmountKRW += assetValueKRW;
      totalAssetKRW += assetValueKRW;

      // 자산 정보 추가
      groupedAssets[mainCategory].subCategories[subCategory].assets.push({
        assetId: asset._id,
        name: asset.name,
        mainCategory: asset.mainCategory,
        subCategory: asset.subCategory,
        totalQuantity: asset.totalQuantity,
        totalAmountKRW: assetValueKRW,
        currentPriceUSD: currentPriceUSD,
        exchangeRateUSD: exchangeRateUSD,
        avgPurchasePriceUSD: avgPurchasePriceUSD
      });
    });

    // 스냅샷 데이터 구성
    const categories = Object.values(groupedAssets).map(category => ({
      ...category,
      subCategories: Object.values(category.subCategories)
    }));

    const snapshotData = {
      userId: userId,
      date: targetDate,
      totalAssetKRW: totalAssetKRW,
      categories: categories,
      exchangeRates: {
        USD: exchangeRateMap['USD'],
        EUR: exchangeRateMap['EUR'],
        JPY: exchangeRateMap['JPY'],
        CNY: exchangeRateMap['CNY']
      },
      stockPrices: stockPrices
    };

    // 기존 스냅샷이 있다면 업데이트, 없다면 생성
    const existingSnapshot = await DailyAssetSnapshot.findOne({
      userId: userId,
      date: targetDate
    });

    if (existingSnapshot) {
      await DailyAssetSnapshot.findByIdAndUpdate(existingSnapshot._id, snapshotData);
      console.log(`Updated snapshot for ${targetDate}: ₩${totalAssetKRW.toLocaleString()}`);
    } else {
      await DailyAssetSnapshot.create(snapshotData);
      console.log(`Created snapshot for ${targetDate}: ₩${totalAssetKRW.toLocaleString()}`);
    }

    return snapshotData;

  } catch (error) {
    console.error(`Error creating snapshot for ${targetDate}:`, error);
    throw error;
  }
};

/**
 * 모든 사용자의 어제 스냅샷을 생성합니다 (cron job용)
 */
const createYesterdaySnapshotsForAllUsers = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = yesterday.toISOString().split('T')[0];

    const users = await User.find({});
    
    for (const user of users) {
      try {
        // 과거 스냅샷이므로 실시간 데이터 사용하지 않음
        await createDailySnapshot(user._id, targetDate, false);
      } catch (error) {
        console.error(`Error creating snapshot for user ${user._id}:`, error);
      }
    }

    console.log(`Completed daily snapshots for ${users.length} users on ${targetDate}`);
  } catch (error) {
    console.error('Error in createYesterdaySnapshotsForAllUsers:', error);
    throw error;
  }
};



module.exports = {
  createDailySnapshot,
  createYesterdaySnapshotsForAllUsers
}; 