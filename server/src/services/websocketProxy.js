const WebSocket = require('ws');
const tokenManager = require('./koreaInvestmentToken');

class WebSocketProxyService {
  constructor() {
    this.wss = null;
    this.kisWebSocket = null;
    this.clientConnections = new Map(); // userId -> WebSocket connection
    this.subscribedSymbols = new Set(); // 현재 구독 중인 종목들
    this.userSymbols = new Map(); // userId -> Set of symbols
  }

  /**
   * WebSocket 프록시 서버 시작
   */
  startProxyServer(port = 8080) {
    this.wss = new WebSocket.Server({ port });
    console.log(`WebSocket 프록시 서버가 포트 ${port}에서 시작되었습니다.`);

    this.wss.on('connection', (ws, req) => {
      console.log('클라이언트 WebSocket 연결');
      this.handleClientConnection(ws, req);
    });
  }

  /**
   * 클라이언트 연결 처리
   */
  async handleClientConnection(clientWs, req) {
    try {
      // URL에서 사용자 ID 추출 (예: /ws?userId=123)
      const url = new URL(req.url, `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');
      
      if (!userId) {
        clientWs.close(1008, '사용자 ID가 필요합니다');
        return;
      }

      // 클라이언트 연결 저장
      this.clientConnections.set(userId, clientWs);
      console.log(`사용자 ${userId} WebSocket 연결됨`);

      // 사용자 자산 기반 종목 구독
      await this.subscribeUserSymbols(userId);

      // 클라이언트 연결 해제 처리
      clientWs.on('close', () => {
        console.log(`사용자 ${userId} WebSocket 연결 해제`);
        this.handleClientDisconnection(userId);
      });

      clientWs.on('error', (error) => {
        console.error(`클라이언트 WebSocket 오류 (사용자: ${userId}):`, error);
        this.handleClientDisconnection(userId);
      });

    } catch (error) {
      console.error('클라이언트 연결 처리 오류:', error);
      clientWs.close(1011, '서버 오류');
    }
  }

  /**
   * 사용자별 종목 구독
   */
  async subscribeUserSymbols(userId) {
    try {
      // 사용자 자산에서 해외주식 종목 조회
      const userStocks = await this.getUserForeignStocks(userId);
      const userSymbolSet = new Set(userStocks.map(stock => stock.key));
      
      this.userSymbols.set(userId, userSymbolSet);

      // 새로운 종목들을 전체 구독 목록에 추가
      const newSymbols = [...userSymbolSet].filter(symbol => !this.subscribedSymbols.has(symbol));
      
      if (newSymbols.length > 0) {
        await this.addSymbolSubscriptions(newSymbols);
      }

      console.log(`사용자 ${userId}의 종목 구독 완료:`, [...userSymbolSet]);

    } catch (error) {
      console.error(`사용자 ${userId} 종목 구독 오류:`, error);
    }
  }

  /**
   * 사용자의 해외주식 자산 조회
   */
  async getUserForeignStocks(userId) {
    try {
      const Asset = require('../models/Asset');
      
      console.log(`사용자 ${userId}의 자산 조회 시작...`);
      
      // 먼저 사용자의 모든 자산 조회해서 확인
      const allAssets = await Asset.find({ userId: userId });
      console.log(`사용자 ${userId}의 전체 자산 개수: ${allAssets.length}`);
      
      if (allAssets.length > 0) {
        console.log('첫 번째 자산 샘플:', {
          name: allAssets[0].name,
          mainCategory: allAssets[0].mainCategory,
          subCategory: allAssets[0].subCategory,
          details: allAssets[0].details
        });
      }
      
      // 사용자의 해외주식 자산 조회
      const assets = await Asset.find({
        userId: userId,
        mainCategory: 'STOCK',
        subCategory: 'FOREIGN'
      });

      console.log(`사용자 ${userId}의 해외주식 자산 개수: ${assets.length}`);

      const stocks = [];
      for (const asset of assets) {
        console.log(`자산 처리 중: ${asset.name}`, {
          details: asset.details,
          detailsType: typeof asset.details,
          detailsEntries: asset.details ? Object.fromEntries(asset.details) : null
        });
        
        // Map에서 데이터 추출
        const details = asset.details;
        let ticker, market;
        
        if (details instanceof Map) {
          ticker = details.get('ticker');
          market = details.get('market');
        } else if (details && typeof details === 'object') {
          ticker = details.ticker;
          market = details.market;
        }
        
        console.log(`추출된 데이터 - Ticker: ${ticker}, Market: ${market}`);
        
        if (ticker) {
          // 종목 키 생성 (한국투자증권 WebSocket 형식)
          const exchangePrefix = this.getExchangePrefix(market || 'NAS'); // 기본값 나스닥
          const key = `${exchangePrefix}${ticker}`;
          
          stocks.push({
            key: key,
            symbol: ticker,
            name: asset.name,
            market: market || 'NAS'
          });
          
          console.log(`종목 추가: ${asset.name} (${ticker}) -> ${key}`);
        } else {
          console.log(`티커가 없는 자산: ${asset.name}`, {
            detailsKeys: details instanceof Map ? Array.from(details.keys()) : Object.keys(details || {})
          });
        }
      }

      console.log(`최종 종목 목록:`, stocks);
      return stocks;
    } catch (error) {
      console.error(`사용자 ${userId} 해외주식 조회 실패:`, error);
      // 에러 시 빈 배열 반환
      return [];
    }
  }

  /**
   * 거래소 코드에 따른 WebSocket 키 접두사 반환
   */
  getExchangePrefix(market) {
    const prefixMap = {
      'NAS': 'DNAS',  // 나스닥
      'NYS': 'DNYS',  // 뉴욕증권거래소
      'AMS': 'DAMS',  // 아멕스
      'TSE': 'DTSE',  // 도쿄증권거래소
      'HKS': 'DHKS',  // 홍콩증권거래소
      'SHS': 'DSHS',  // 상하이증권거래소
      'SZS': 'DSZS'   // 선전증권거래소
    };
    
    return prefixMap[market] || 'DNAS'; // 기본값: 나스닥
  }

  /**
   * 한국투자증권 WebSocket 연결
   */
  async connectToKIS() {
    try {
      if (this.kisWebSocket && this.kisWebSocket.readyState === WebSocket.OPEN) {
        return; // 이미 연결됨
      }

      const approvalKey = await tokenManager.getWebsocketToken();
      this.kisWebSocket = new WebSocket('ws://ops.koreainvestment.com:21000');

      this.kisWebSocket.on('open', () => {
        console.log('한국투자증권 WebSocket 연결 성공');
      });

      this.kisWebSocket.on('message', (data) => {
        this.handleKISMessage(data);
      });

      this.kisWebSocket.on('close', () => {
        console.log('한국투자증권 WebSocket 연결 종료');
        this.kisWebSocket = null;
        // 재연결 로직
        setTimeout(() => this.connectToKIS(), 5000);
      });

      this.kisWebSocket.on('error', (error) => {
        console.error('한국투자증권 WebSocket 오류:', error);
      });

    } catch (error) {
      console.error('한국투자증권 WebSocket 연결 실패:', error);
    }
  }

  /**
   * 종목 구독 추가
   */
  async addSymbolSubscriptions(symbols) {
    if (!this.kisWebSocket || this.kisWebSocket.readyState !== WebSocket.OPEN) {
      await this.connectToKIS();
    }

    const approvalKey = await tokenManager.getWebsocketToken();

    for (const symbol of symbols) {
      const subscribeMessage = {
        header: {
          approval_key: approvalKey,
          custtype: "P",
          tr_type: "1",
          "content-type": "utf-8"
        },
        body: {
          input: {
            tr_id: "HDFSCNT0",
            tr_key: symbol
          }
        }
      };

      this.kisWebSocket.send(JSON.stringify(subscribeMessage));
      this.subscribedSymbols.add(symbol);
      console.log(`종목 구독 추가: ${symbol}`);
    }
  }

  /**
   * 한국투자증권에서 받은 데이터 처리
   */
  handleKISMessage(data) {
    try {
      // 데이터 파싱 (기존 로직 사용)
      const parsedData = this.parseStockData(data.toString());
      
      if (parsedData) {
        // 해당 종목을 구독하는 모든 사용자에게 전송
        this.broadcastToInterestedUsers(parsedData);
      }

    } catch (error) {
      console.error('KIS 메시지 처리 오류:', error);
    }
  }

  /**
   * 관심 있는 사용자들에게 데이터 브로드캐스트
   */
  broadcastToInterestedUsers(stockData) {
    const { symbol } = stockData;

    for (const [userId, userSymbols] of this.userSymbols.entries()) {
      if (userSymbols.has(symbol)) {
        const clientWs = this.clientConnections.get(userId);
        if (clientWs && clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'stock_update',
            data: stockData
          }));
        }
      }
    }
  }

  /**
   * 주식 데이터 파싱 (한국투자증권 WebSocket 응답)
   */
  parseStockData(data) {
    try {
      // 한국투자증권 WebSocket 응답 데이터 파싱 (캐럿(^) 구분)
      if (typeof data === 'string' && data.includes('^')) {
        const values = data.split('^');
        
        if (values.length >= 15) {
          // 첫 번째 필드에서 종목 키 추출
          const firstField = values[0] || '';
          const stockKey = firstField.includes('|') ? firstField.split('|').pop() : firstField;
          
          const openPrice = parseFloat(values[8]) || 0;
          const highPrice = parseFloat(values[9]) || 0;
          const lowPrice = parseFloat(values[10]) || 0;
          const currentPrice = parseFloat(values[11]) || 0;
          const changeSign = values[12] || '0';
          const change = parseFloat(values[13]) || 0;
          const changePercent = parseFloat(values[14]) || 0;
          
          // 전일종가 계산
          const prevClose = currentPrice - change;
          
          // 대비구분에 따라 등락 부호 조정
          let adjustedChange = change;
          let adjustedChangePercent = changePercent;
          
          if (changeSign === '3' || changeSign === '5') { // 하락
            adjustedChange = -Math.abs(change);
            adjustedChangePercent = -Math.abs(changePercent);
          } else if (changeSign === '1' || changeSign === '4') { // 상승
            adjustedChange = Math.abs(change);
            adjustedChangePercent = Math.abs(changePercent);
          }
          
          return {
            symbol: stockKey,
            currentPrice: currentPrice,
            change: adjustedChange,
            changePercent: adjustedChangePercent,
            highPrice: highPrice,
            lowPrice: lowPrice,
            prevClose: prevClose,
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch (e) {
      console.error('주식 데이터 파싱 오류:', e);
    }
    
    return null;
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  handleClientDisconnection(userId) {
    this.clientConnections.delete(userId);
    const userSymbols = this.userSymbols.get(userId);
    this.userSymbols.delete(userId);

    // 더 이상 구독하지 않는 종목들 정리
    if (userSymbols) {
      this.cleanupUnusedSubscriptions(userSymbols);
    }
  }

  /**
   * 사용하지 않는 구독 정리
   */
  cleanupUnusedSubscriptions(removedSymbols) {
    for (const symbol of removedSymbols) {
      // 다른 사용자가 이 종목을 구독하고 있는지 확인
      const stillNeeded = Array.from(this.userSymbols.values())
        .some(userSymbols => userSymbols.has(symbol));
      
      if (!stillNeeded) {
        this.subscribedSymbols.delete(symbol);
        // TODO: 한국투자증권에 구독 해제 메시지 전송
        console.log(`종목 구독 해제: ${symbol}`);
      }
    }
  }

  /**
   * 프록시 서버 종료
   */
  stop() {
    if (this.wss) {
      this.wss.close();
    }
    if (this.kisWebSocket) {
      this.kisWebSocket.close();
    }
    this.clientConnections.clear();
    this.userSymbols.clear();
    this.subscribedSymbols.clear();
  }
}

module.exports = new WebSocketProxyService(); 