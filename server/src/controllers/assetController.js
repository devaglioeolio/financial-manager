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
      
      // 기본 자산 정보
      const assetInfo = {
        id: asset._id,
        name: asset.name,
        amount: asset.amount,
        currency: asset.currency,
        transactions: asset.transactions,
        details: asset.details
      };

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
      if (asset.amount < transactionAmount) {
        return res.status(400).json({ message: '보유 금액보다 많은 금액을 매도할 수 없습니다.' });
      }
      asset.amount -= transactionAmount;
      asset.totalQuantity -= quantity;
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