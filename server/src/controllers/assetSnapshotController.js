const DailyAssetSnapshot = require('../models/DailyAssetSnapshot');
const { createDailySnapshot, createMissingSnapshotsForUser, createMissingSnapshotsForAllUsers } = require('../services/dailySnapshotService');
const Asset = require('../models/Asset');
const { getExchangeRatesWithChange } = require('../services/exchangeRateService');

// 일별 자산 변화 조회
exports.getDailyAssetChanges = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const userId = req.user.id;

    // 요청된 기간의 끝 날짜 (어제까지만)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // 어제로 설정
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days) + 1);

    // 저장된 스냅샷에서 데이터 가져오기 (어제까지만)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const savedSnapshots = await DailyAssetSnapshot.getDateRange(
      userId, 
      startDateStr, 
      endDateStr
    );

    const result = [];

    // 저장된 스냅샷 데이터만 추가
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

    // 날짜순 정렬
    result.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: result,
      period: {
        start: startDateStr,
        end: endDateStr,
        days: parseInt(days)
      },
      note: "오늘 데이터는 클라이언트에서 실시간 데이터를 활용하여 계산됩니다."
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

// 사용자의 누락된 스냅샷 백필
exports.backfillMissingSnapshots = async (req, res) => {
  try {
    const { startDate, endDate, days = 7 } = req.body;
    const userId = req.user.id;

    console.log(`사용자 ${userId}의 누락된 스냅샷 백필 요청`);

    const result = await createMissingSnapshotsForUser(userId, startDate, endDate || null);

    res.json({
      success: true,
      message: '누락된 스냅샷 백필이 완료되었습니다.',
      data: result
    });

  } catch (error) {
    console.error('누락된 스냅샷 백필 실패:', error);
    res.status(500).json({
      success: false,
      message: '누락된 스냅샷 백필에 실패했습니다.',
      error: error.message
    });
  }
};

// 모든 사용자의 누락된 스냅샷 백필 (관리자용)
exports.backfillAllUsers = async (req, res) => {
  try {
    const { days = 7 } = req.body;

    console.log(`모든 사용자의 누락된 스냅샷 백필 요청 (${days}일)`);

    const result = await createMissingSnapshotsForAllUsers(days);

    res.json({
      success: true,
      message: '모든 사용자의 누락된 스냅샷 백필이 완료되었습니다.',
      data: result
    });

  } catch (error) {
    console.error('전체 사용자 누락된 스냅샷 백필 실패:', error);
    res.status(500).json({
      success: false,
      message: '전체 사용자 누락된 스냅샷 백필에 실패했습니다.',
      error: error.message
    });
  }
};

module.exports = exports; 