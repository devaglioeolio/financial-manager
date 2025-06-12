const DailyAssetSnapshot = require('../models/DailyAssetSnapshot');
const { createDailySnapshot } = require('../services/dailySnapshotService');
const Asset = require('../models/Asset');
const { getExchangeRatesWithChange } = require('../services/exchangeRateService');
const { calculateStockReturns } = require('../services/stockPriceService');

// 일별 자산 변화 조회
exports.getDailyAssetChanges = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const userId = req.user.id;

    // 요청된 기간의 끝 날짜 (오늘)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    // 과거 데이터는 저장된 스냅샷에서 가져오기
    const startDateStr = startDate.toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const savedSnapshots = await DailyAssetSnapshot.getDateRange(
      userId, 
      startDateStr, 
      yesterdayStr
    );

    const result = [];

    // 저장된 스냅샷 데이터 추가
    savedSnapshots.forEach(snapshot => {
      result.push({
        date: snapshot.date,
        totalAmount: snapshot.totalAssetKRW,
        categories: snapshot.categories.map(cat => ({
          category: cat.mainCategory,
          categoryName: cat.categoryName,
          amount: cat.totalAmountKRW
        }))
      });
    });

    // 오늘 데이터는 실시간 계산
    const todayStr = endDate.toISOString().split('T')[0];
    const todayAssets = await calculateTodayAssets(userId);
    
    if (todayAssets) {
      result.push({
        date: todayStr,
        totalAmount: todayAssets.totalAmount,
        categories: todayAssets.categories,
        isRealTime: true
      });
    }

    // 날짜순 정렬
    result.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: result,
      period: {
        start: startDateStr,
        end: todayStr,
        days: parseInt(days)
      }
    });

  } catch (error) {
    console.error('일별 자산 변화 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '일별 자산 변화 조회에 실패했습니다.',
      error: error.message
    });
  }
};

// 오늘 자산 계산 (실시간)
const calculateTodayAssets = async (userId) => {
  try {
    // createDailySnapshot 함수를 재사용하되 실시간 데이터로 조회
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await createDailySnapshot(userId, today, true);
    
    if (!snapshot) {
      return null;
    }

    // 기존 형식으로 변환
    const categories = snapshot.categories.map(cat => ({
      category: cat.mainCategory,
      categoryName: cat.categoryName,
      amount: cat.totalAmountKRW
    }));

    return {
      totalAmount: snapshot.totalAssetKRW,
      categories: categories
    };



  } catch (error) {
    console.error('오늘 자산 계산 실패:', error);
    return null;
  }
};



// 특정 날짜 스냅샷 수동 생성
exports.createSnapshot = async (req, res) => {
  try {
    const { date } = req.body;
    const userId = req.user.id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date를 제공해주세요. (YYYY-MM-DD 형식)'
      });
    }

    const snapshot = await createDailySnapshot(userId, date);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: '해당 날짜에 자산이 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '스냅샷이 생성되었습니다.',
      data: {
        date: snapshot.date,
        totalAsset: snapshot.totalAssetKRW
      }
    });

  } catch (error) {
    console.error('스냅샷 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: '스냅샷 생성에 실패했습니다.',
      error: error.message
    });
  }
};

// 저장된 스냅샷 목록 조회
exports.getSnapshots = async (req, res) => {
  try {
    const { startDate, endDate, limit = 30 } = req.query;
    const userId = req.user.id;

    let query = { userId: userId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const snapshots = await DailyAssetSnapshot.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .select('date totalAssetKRW createdAt');

    res.json({
      success: true,
      data: snapshots.map(snapshot => ({
        date: snapshot.date,
        totalAsset: snapshot.totalAssetKRW,
        createdAt: snapshot.createdAt
      }))
    });

  } catch (error) {
    console.error('스냅샷 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '스냅샷 목록 조회에 실패했습니다.',
      error: error.message
    });
  }
};

module.exports = exports; 