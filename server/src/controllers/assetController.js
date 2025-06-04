const Asset = require('../models/Asset');

// 자산 목록 조회
exports.getAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ userId: req.user.id });
    
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
      
      // 평균 매수가 계산
      const averagePurchasePrice = asset.getAveragePurchasePrice();
      
      acc[mainCategory].subCategories[subCategory].assets.push({
        id: asset._id,
        name: asset.name,
        amount: asset.amount,
        currency: asset.currency,
        averagePurchasePrice,
        transactions: asset.transactions,
        details: asset.details
      });
      
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
      mainCategory, 
      subCategory, 
      name, 
      amount, 
      currency,
      price,
      exchangeRate,
      details 
    } = req.body;

    const asset = new Asset({
      userId: req.user.id,
      mainCategory,
      subCategory,
      name,
      amount,
      currency,
      transactions: [{
        type: 'BUY',
        amount,
        price,
        exchangeRate: exchangeRate || 1,
        date: new Date()
      }],
      details
    });

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
    const { type, amount, price, exchangeRate } = req.body;

    const asset = await Asset.findOne({ _id: id, userId: req.user.id });
    if (!asset) {
      return res.status(404).json({ message: '자산을 찾을 수 없습니다.' });
    }

    // 거래 추가
    asset.transactions.push({
      type,
      amount,
      price,
      exchangeRate: exchangeRate || 1,
      date: new Date()
    });

    // 보유 수량 업데이트
    if (type === 'BUY') {
      asset.amount += amount;
    } else if (type === 'SELL') {
      if (asset.amount < amount) {
        return res.status(400).json({ message: '보유 수량보다 많은 수량을 매도할 수 없습니다.' });
      }
      asset.amount -= amount;
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