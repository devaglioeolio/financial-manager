const axios = require('axios');
const Token = require('../models/Token');

class KoreaInvestmentTokenManager {
    constructor() {
        this.tokenExpiryTime = 24 * 60 * 60 * 1000; // 24시간을 밀리초로 변환
    }

    async getRestToken() {
        // DB에서 먼저 토큰 확인
        const tokenData = await Token.findOne({ type: 'REST' });
        
        if (this.shouldUpdateToken(tokenData)) {
            await this.updateRestToken();
            // 업데이트 후 다시 DB에서 가져오기
            const updatedToken = await Token.findOne({ type: 'REST' });
            return updatedToken.token;
        }
        
        return tokenData.token;
    }

    async getWebsocketToken() {
        // DB에서 먼저 토큰 확인
        const tokenData = await Token.findOne({ type: 'WEBSOCKET' });
        
        if (this.shouldUpdateToken(tokenData)) {
            await this.updateWebsocketToken();
            // 업데이트 후 다시 DB에서 가져오기
            const updatedToken = await Token.findOne({ type: 'WEBSOCKET' });
            return updatedToken.token;
        }
        
        return tokenData.token;
    }

    shouldUpdateToken(tokenData) {
        if (!tokenData) return true;
        const now = new Date();
        const timeSinceLastUpdate = now - tokenData.lastUpdated;
        return timeSinceLastUpdate >= this.tokenExpiryTime;
    }

    async updateRestToken() {
        try {
            console.log('REST API 토큰을 업데이트합니다...');
            
            const response = await axios.post(
                'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
                {
                    grant_type: 'client_credentials',
                    appkey: process.env.KOREA_INV_APPKEY,
                    appsecret: process.env.KOREA_INV_APPSECRET
                }
            );

            // DB에 토큰 저장
            await Token.findOneAndUpdate(
                { type: 'REST' },
                {
                    token: response.data.access_token,
                    lastUpdated: new Date()
                },
                { upsert: true }
            );

            console.log('REST API 토큰이 성공적으로 업데이트되었습니다.');
        } catch (error) {
            console.error('REST API 토큰 업데이트 중 오류 발생:', error);
            throw error;
        }
    }

    async updateWebsocketToken() {
        try {
            console.log('WebSocket 토큰을 업데이트합니다...');
            
            const response = await axios.post(
                'https://openapi.koreainvestment.com:9443/oauth2/Approval',
                {
                    grant_type: 'client_credentials',
                    appkey: process.env.KOREA_INV_APPKEY,
                    secretkey: process.env.KOREA_INV_APPSECRET
                }
            );

            // DB에 토큰 저장
            await Token.findOneAndUpdate(
                { type: 'WEBSOCKET' },
                {
                    token: response.data.approval_key,
                    lastUpdated: new Date()
                },
                { upsert: true }
            );

            console.log('WebSocket 토큰이 성공적으로 업데이트되었습니다.');
        } catch (error) {
            console.error('WebSocket 토큰 업데이트 중 오류 발생:', error);
            throw error;
        }
    }

    // 서버 시작 시 초기 토큰 발급 (10초 지연)
    async initializeTokens() {
        console.log('10초 후 토큰 초기화를 시작합니다...');
        
        return new Promise((resolve) => {
            setTimeout(async () => {
                try {
                    // DB에서 기존 토큰 확인
                    const restToken = await Token.findOne({ type: 'REST' });
                    const websocketToken = await Token.findOne({ type: 'WEBSOCKET' });

                    // REST 토큰이 없거나 만료된 경우
                    if (this.shouldUpdateToken(restToken)) {
                        await this.updateRestToken();
                    } else {
                        console.log('REST API 토큰이 유효합니다.');
                    }

                    // WebSocket 토큰이 없거나 만료된 경우
                    if (this.shouldUpdateToken(websocketToken)) {
                        await this.updateWebsocketToken();
                    } else {
                        console.log('WebSocket 토큰이 유효합니다.');
                    }

                    console.log('토큰 초기화가 완료되었습니다.');
                    resolve();
                } catch (error) {
                    console.error('토큰 초기화 중 오류:', error);
                    resolve(); // 에러가 발생해도 서버는 계속 실행
                }
            }, 10000); // 10초 지연
        });
    }
}

// 싱글톤 인스턴스 생성
const tokenManager = new KoreaInvestmentTokenManager();

module.exports = tokenManager; 