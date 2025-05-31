const amqp = require('amqplib');
const dotenv = require('dotenv');

dotenv.config();

/**
 * RabbitMQ configuration and connection manager
 * Implements singleton pattern
 */
class RabbitmqConfig {
    constructor() {
        if (RabbitmqConfig.instance) {
            return RabbitmqConfig.instance;
        }
        
        this.connection = null;
        this.channel = null;
        this.url = process.env.RABBITMQ_URL || 'amqp://localhost';

        RabbitmqConfig.instance = this;
    }

    /**
     * Get singleton instance
     * @returns {RabbitmqConfig} Singleton instance
     */
    static getInstance() {
        if (!RabbitmqConfig.instance) {
            RabbitmqConfig.instance = new RabbitmqConfig();
        }
        return RabbitmqConfig.instance;
    }

    /**
     * Connect to RabbitMQ server
     * @returns {Promise<void>}
     */
    async connect() {
        try {
            // Skip connection if we're running the API Gateway service
            if (process.argv.includes('-s=api-gateway')) {
                console.log('API Gateway service detected, skipping RabbitMQ connection');
                return;
            }

            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();

            console.log('Connected to RabbitMQ');

            // Handle connection close
            this.connection.on('close', () => {
                console.log('RabbitMQ connection closed');
                this._reconnect();
            });

            // Handle errors
            this.connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err);
                this._reconnect();
            });
        } catch (error) {
            console.error('Failed to connect to RabbitMQ:', error);
            this._reconnect();
        }
    }

    /**
     * Reconnect to RabbitMQ after a delay
     * @private
     */
    _reconnect() {
        console.log('Attempting to reconnect to RabbitMQ in 5 seconds...');
        setTimeout(() => {
            this.connect().catch(err => {
                console.error('Reconnection failed:', err);
            });
        }, 5000);
    }

    /**
     * Close the connection
     * @returns {Promise<void>}
     */
    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            console.log('Closed RabbitMQ connection');
        } catch (error) {
            console.error('Error closing RabbitMQ connection:', error);
        }
    }
}

// Create and export singleton instance
module.exports = RabbitmqConfig.getInstance();