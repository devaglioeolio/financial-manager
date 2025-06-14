const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['REST', 'WEBSOCKET'],
        required: true
    },
    token: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: false // 기존 데이터 호환성을 위해 optional로 설정
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Token', tokenSchema); 