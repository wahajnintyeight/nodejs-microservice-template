const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const config = {
    service: {
        name: 'api-service',
        version: process.env.API_VERSION || '1.0.0'
    },
    server: {
        port: parseInt(process.env.API_PORT || '3001'),
        host: process.env.API_HOST || 'localhost'
    },
    logging: {
        level: process.env.API_LOG_LEVEL || 'info'
    },
    queues: {
        requests: 'api.requests',
        responses: 'api.responses'
    },
    routes: {
        prefix: '/api'
    }
};

module.exports = config; 