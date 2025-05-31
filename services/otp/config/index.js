const dotenv = require('dotenv');

dotenv.config();

const config = {
    service: {
        name: 'otp-service',
        version: process.env.OTP_VERSION || '1.0.0'
    },
    server: {
        port: parseInt(process.env.OTP_PORT || '3002'),
        host: process.env.OTP_HOST || 'localhost'
    },
    logging: {
        level: process.env.OTP_LOG_LEVEL || 'info'
    },
    queues: {
        requests: 'otp.requests',
        responses: 'otp.responses'
    },
    otp: {
        expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
        length: parseInt(process.env.OTP_LENGTH || '6'),
        type: process.env.OTP_TYPE || 'numeric'
    }
};

module.exports = config;