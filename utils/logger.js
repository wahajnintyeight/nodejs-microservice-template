const winston = require('winston');

/**
 * Creates and configures a Winston logger instance
 * @param {Object} options - Logger configuration options
 * @param {string} options.serviceName - Name of the service using the logger
 * @param {string} options.level - Minimum log level (debug, info, warn, error)
 * @returns {winston.Logger} Configured Winston logger instance
 */
function createLogger(options = {}) {
    try {
        const logger = winston.createLogger({
            level: options.level || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { 
                service: options.serviceName || 'unknown-service'
            },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                new winston.transports.File({ 
                    filename: 'error.log', 
                    level: 'error' 
                }),
                new winston.transports.File({ 
                    filename: 'combined.log' 
                })
            ]
        });

        return logger;
    } catch (error) {
        console.error('Failed to create logger:', error);
        throw error;
    }
}

module.exports = createLogger;
