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
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Token', tokenSchema); 