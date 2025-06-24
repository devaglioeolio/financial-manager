const Watchlist = require('../models/Watchlist');
const StockCode = require('../models/StockCode');
const webSocketProxy = require('../services/websocketProxy');

// 사용자의 관심종목 목록 조회
exports.getWatchlist = async (req, res) => {
  try {
    const watchlist = await Watchlist.find({ userId: req.user.id })
      .sort({ addedAt: -1 })
      .select('market ticker englishName koreanName addedAt');

    res.json({
      success: true,
      data: watchlist,
      count: watchlist.length
    });

  } catch (error) {
    console.error('관심종목 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '관심종목 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 관심종목에 추가
exports.addToWatchlist = async (req, res) => {
  try {
    const { market, ticker, englishName, koreanName } = req.body;

    // 필수 입력값 확인
    if (!market || !ticker || !englishName) {
      return res.status(400).json({
        success: false,
        message: '시장(market), 티커(ticker), 영어명(englishName)은 필수입니다.'
      });
    }

    // 유효한 시장인지 확인
    if (!['NAS', 'NYS', 'AMS'].includes(market.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 시장입니다. (NAS, NYS, AMS만 지원)'
      });
    }

    // 실제 존재하는 종목인지 확인
    const stockExists = await StockCode.findOne({
      market: market.toUpperCase(),
      ticker: ticker.toUpperCase(),
      isActive: true
    });

    if (!stockExists) {
      return res.status(404).json({
        success: false,
        message: '존재하지 않는 종목입니다.'
      });
    }

    // 이미 관심종목에 있는지 확인
    const existingWatchlist = await Watchlist.findOne({
      userId: req.user.id,
      market: market.toUpperCase(),
      ticker: ticker.toUpperCase()
    });

    if (existingWatchlist) {
      return res.status(409).json({
        success: false,
        message: '이미 관심종목에 추가된 종목입니다.'
      });
    }

    // 관심종목에 추가
    const watchlistItem = new Watchlist({
      userId: req.user.id,
      market: market.toUpperCase(),
      ticker: ticker.toUpperCase(),
      englishName: englishName.trim(),
      koreanName: koreanName?.trim() || null
    });

    await watchlistItem.save();

    // WebSocket 구독 업데이트 (비동기로 실행하여 응답 지연 방지)
    setImmediate(() => {
      webSocketProxy.updateUserWatchlistSubscription(req.user.id)
        .catch(error => console.error('WebSocket 구독 업데이트 실패:', error));
    });

    res.status(201).json({
      success: true,
      message: '관심종목에 추가되었습니다.',
      data: watchlistItem
    });

  } catch (error) {
    console.error('관심종목 추가 에러:', error);
    
    // 중복 키 에러 (MongoDB 유니크 제약 조건)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '이미 관심종목에 추가된 종목입니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '관심종목 추가 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 관심종목에서 제거
exports.removeFromWatchlist = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '관심종목 ID가 필요합니다.'
      });
    }

    // 사용자의 관심종목인지 확인하고 삭제
    const deletedItem = await Watchlist.findOneAndDelete({
      _id: id,
      userId: req.user.id
    });

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: '해당 관심종목을 찾을 수 없거나 삭제 권한이 없습니다.'
      });
    }

    // WebSocket 구독 업데이트 (비동기로 실행하여 응답 지연 방지)
    setImmediate(() => {
      webSocketProxy.updateUserWatchlistSubscription(req.user.id)
        .catch(error => console.error('WebSocket 구독 업데이트 실패:', error));
    });

    res.json({
      success: true,
      message: '관심종목에서 제거되었습니다.',
      data: deletedItem
    });

  } catch (error) {
    console.error('관심종목 제거 에러:', error);
    res.status(500).json({
      success: false,
      message: '관심종목 제거 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 특정 종목이 관심종목에 있는지 확인
exports.checkWatchlistStatus = async (req, res) => {
  try {
    const { market, ticker } = req.params;

    if (!market || !ticker) {
      return res.status(400).json({
        success: false,
        message: '시장(market)과 티커(ticker)가 필요합니다.'
      });
    }

    const watchlistItem = await Watchlist.findOne({
      userId: req.user.id,
      market: market.toUpperCase(),
      ticker: ticker.toUpperCase()
    });

    res.json({
      success: true,
      data: {
        isInWatchlist: !!watchlistItem,
        watchlistItem: watchlistItem || null
      }
    });

  } catch (error) {
    console.error('관심종목 상태 확인 에러:', error);
    res.status(500).json({
      success: false,
      message: '관심종목 상태 확인 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 관심종목 통계
exports.getWatchlistStats = async (req, res) => {
  try {
    const stats = await Watchlist.aggregate([
      { $match: { userId: req.user.id } },
      {
        $group: {
          _id: '$market',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalCount = await Watchlist.countDocuments({ userId: req.user.id });

    res.json({
      success: true,
      data: {
        byMarket: stats,
        totalCount: totalCount
      }
    });

  } catch (error) {
    console.error('관심종목 통계 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '관심종목 통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}; 