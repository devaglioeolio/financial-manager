const axios = require('axios');
const Token = require('../models/Token');

class KoreaInvestmentTokenManager {
    constructor() {
        // 기존 24시간 fallback은 유지하되, 실제 만료시간을 우선 사용
        this.tokenExpiryTime = 24 * 60 * 60 * 1000; // 24시간을 밀리초로 변환 (fallback용)
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
        
        // 실제 토큰 만료시간이 있는 경우 이를 우선 사용
        if (tokenData.expiresAt) {
            const isExpired = now >= tokenData.expiresAt;
            if (isExpired) {
                console.log(`토큰이 만료되었습니다. 만료시간: ${tokenData.expiresAt.toISOString()}, 현재시간: ${now.toISOString()}`);
            }
            return isExpired;
        }
        
        // expiresAt이 없는 경우 기존 방식 사용 (fallback)
        const timeSinceLastUpdate = now - tokenData.lastUpdated;
        const isExpiredByTime = timeSinceLastUpdate >= this.tokenExpiryTime;
        if (isExpiredByTime) {
            console.log(`토큰이 시간 기준으로 만료되었습니다. 마지막 업데이트: ${tokenData.lastUpdated.toISOString()}`);
        }
        return isExpiredByTime;
    }

    /**
     * 토큰 만료시간 문자열을 Date 객체로 변환
     * @param {string} expiryString - "2025-06-15 21:42:39" 형식의 문자열
     * @returns {Date} - Date 객체
     */
    parseTokenExpiry(expiryString) {
        try {
            // "2025-06-15 21:42:39" 형식을 ISO 형식으로 변환
            const isoString = expiryString.replace(' ', 'T') + '+09:00'; // 한국 시간대 추가
            return new Date(isoString);
        } catch (error) {
            console.warn('토큰 만료시간 파싱 실패:', expiryString, error.message);
            return null;
        }
    }

    async updateRestToken() {
        try {
            console.log('REST API 토큰을 업데이트합니다...');
            
            const response = await axios.post(
                `${process.env.KOREA_INV_APIDOMAIN}/oauth2/tokenP`,
                {
                    grant_type: 'client_credentials',
                    appkey: process.env.KOREA_INV_APPKEY,
                    appsecret: process.env.KOREA_INV_APPSECRET
                }
            );

            const responseData = response.data;
            console.log('REST API 토큰 응답 데이터:', responseData);

            // 토큰 만료시간 파싱
            let expiresAt = null;
            if (responseData.access_token_token_expired) {
                expiresAt = this.parseTokenExpiry(responseData.access_token_token_expired);
                console.log(`REST API 토큰 만료시간: ${expiresAt ? expiresAt.toISOString() : '파싱 실패'}`);
            }

            // DB에 토큰 저장
            const updateData = {
                token: responseData.access_token,
                lastUpdated: new Date()
            };

            // 만료시간이 파싱되었으면 추가
            if (expiresAt) {
                updateData.expiresAt = expiresAt;
            }

            await Token.findOneAndUpdate(
                { type: 'REST' },
                updateData,
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
                `${process.env.KOREA_INV_APIDOMAIN}/oauth2/Approval`,
                {
                    grant_type: 'client_credentials',
                    appkey: process.env.KOREA_INV_APPKEY,
                    secretkey: process.env.KOREA_INV_APPSECRET
                }
            );

            const responseData = response.data;
            console.log('WebSocket 토큰 응답 데이터:', responseData);

            // WebSocket 토큰은 만료시간을 제공하지 않으므로 기존 방식 사용
            // DB에 토큰 저장 (expiresAt 없이)
            await Token.findOneAndUpdate(
                { type: 'WEBSOCKET' },
                {
                    token: responseData.approval_key,
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
                        if (restToken.expiresAt) {
                            console.log(`REST API 토큰 만료 예정: ${restToken.expiresAt.toISOString()}`);
                        }
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