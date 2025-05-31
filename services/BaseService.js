
class BaseService {
    /**
     * Create a new BaseService
     * @param {Object} options - Service configuration options
     * @param {string} options.name - Service name
     * @param {number} options.port - Port to run the service on
     * @param {Object} options.connection - Message broker connection
     * @param {Object} options.channel - Message broker channel
     * @param {string} options.configPath - Path to service configuration file
     * @param {string} options.env - Environment (development, production, etc.)
     * @param {Object} options.registry - Service registry instance
     */
    constructor(options = {}) {
        this.name = options.name || 'unknown-service';
        this.port = options.port || 3000;
        this.connection = options.connection;
        this.channel = options.channel;
        this.configPath = options.configPath;
        this.env = options.env || 'development';
        this.registry = options.registry;
        this.registryInfo = null;
        this.isRunning = false;
        this.queues = {};
        this.exchanges = {};

        // Bind methods to this instance
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
        this.registerQueue = this.registerQueue.bind(this);
        this.registerExchange = this.registerExchange.bind(this);
        this.publishToQueue = this.publishToQueue.bind(this);
        this.consumeFromQueue = this.consumeFromQueue.bind(this);
        this.registerWithRegistry = this.registerWithRegistry.bind(this);
        this.unregisterFromRegistry = this.unregisterFromRegistry.bind(this);

        console.log(`[${this.name}] Service instance created`);
    }


    async start() {
        try {
            if (this.isRunning) {
                console.log(`[${this.name}] Service is already running`);
                return;
            }

            console.log(`[${this.name}] Starting service on port ${this.port}`);

            // Initialize message broker if available
            if (this.connection && this.channel) {
                await this._initializeBroker();
            }

            // Register with service registry if available
            if (this.registry && this.port > 0) {
                await this.registerWithRegistry();
            }

            // Register for process events for graceful shutdown
            this._registerProcessEvents();

            this.isRunning = true;
            console.log(`[${this.name}] Service started successfully`);
        } catch (error) {
            console.error(`[${this.name}] Failed to start service:`, error);
            throw error;
        }
    }


    async stop() {
        try {
            if (!this.isRunning) {
                console.log(`[${this.name}] Service is not running`);
                return;
            }

            console.log(`[${this.name}] Stopping service`);

            // Unregister from service registry if registered
            if (this.registry && this.registryInfo) {
                await this.unregisterFromRegistry();
            }

            // Cleanup resources
            await this._cleanup();

            this.isRunning = false;
            console.log(`[${this.name}] Service stopped successfully`);
        } catch (error) {
            console.error(`[${this.name}] Failed to stop service:`, error);
            throw error;
        }
    }


    async registerWithRegistry(metadata = {}) {
        try {
            if (!this.registry) {
                console.log(`[${this.name}] No service registry available, skipping registration`);
                return null;
            }

            // Get hostname - in production, this would be the actual hostname or IP
            const hostname = process.env.SERVICE_HOST || 'localhost';

            // Register service
            this.registryInfo = this.registry.register(
                this.name,
                hostname,
                this.port,
                {
                    env: this.env,
                    ...metadata
                }
            );

            console.log(`[${this.name}] Registered with service registry`);
            return this.registryInfo;
        } catch (error) {
            console.error(`[${this.name}] Failed to register with service registry:`, error);
            throw error;
        }
    }


    async unregisterFromRegistry() {
        try {
            if (!this.registry || !this.registryInfo) {
                console.log(`[${this.name}] Not registered with service registry`);
                return false;
            }

            const { name, host, port } = this.registryInfo;
            const result = this.registry.unregister(name, host, port);

            if (result) {
                this.registryInfo = null;
                console.log(`[${this.name}] Unregistered from service registry`);
            }

            return result;
        } catch (error) {
            console.error(`[${this.name}] Failed to unregister from service registry:`, error);
            throw error;
        }
    }

    async registerQueue(queueName, options = {}) {
        try {
            if (!this.channel) {
                throw new Error('Message broker channel not available');
            }

            const queue = await this.channel.assertQueue(queueName, {
                durable: true,
                ...options
            });

            this.queues[queueName] = queue;
            console.log(`[${this.name}] Registered queue: ${queueName}`);

            return queue;
        } catch (error) {
            console.error(`[${this.name}] Failed to register queue ${queueName}:`, error);
            throw error;
        }
    }


    async registerExchange(exchangeName, type = 'direct', options = {}) {
        try {
            if (!this.channel) {
                throw new Error('Message broker channel not available');
            }

            await this.channel.assertExchange(exchangeName, type, {
                durable: true,
                ...options
            });

            this.exchanges[exchangeName] = { name: exchangeName, type };
            console.log(`[${this.name}] Registered exchange: ${exchangeName} (${type})`);

            return this.exchanges[exchangeName];
        } catch (error) {
            console.error(`[${this.name}] Failed to register exchange ${exchangeName}:`, error);
            throw error;
        }
    }


    async publishToQueue(queueName, message, options = {}) {
        try {
            if (!this.channel) {
                throw new Error('Message broker channel not available');
            }

            // Ensure queue exists
            if (!this.queues[queueName]) {
                await this.registerQueue(queueName);
            }

            const content = Buffer.from(typeof message === 'string' ? message : JSON.stringify(message));

            const result = this.channel.sendToQueue(queueName, content, {
                persistent: true,
                ...options
            });

            console.log(`[${this.name}] Published message to queue: ${queueName}`);
            return result;
        } catch (error) {
            console.error(`[${this.name}] Failed to publish to queue ${queueName}:`, error);
            throw error;
        }
    }

    async consumeFromQueue(queueName, callback, options = {}) {
        try {
            if (!this.channel) {
                throw new Error('Message broker channel not available');
            }

            // Ensure queue exists
            if (!this.queues[queueName]) {
                await this.registerQueue(queueName);
            }

            const { consumerTag } = await this.channel.consume(
                queueName,
                async (msg) => {
                    if (msg === null) {
                        console.log(`[${this.name}] Consumer cancelled by server`);
                        return;
                    }

                    try {
                        // Parse message content
                        const content = msg.content.toString();
                        let parsedContent;

                        try {
                            parsedContent = JSON.parse(content);
                        } catch (err) {
                            parsedContent = content;
                        }

                        // Process message
                        await callback(parsedContent, msg);

                        // Acknowledge message
                        this.channel.ack(msg);
                    } catch (error) {
                        console.error(`[${this.name}] Error processing message:`, error);
                        // Reject message and requeue
                        this.channel.nack(msg, false, true);
                    }
                },
                { ...options }
            );

            console.log(`[${this.name}] Consuming from queue: ${queueName} (${consumerTag})`);
            return { consumerTag };
        } catch (error) {
            console.error(`[${this.name}] Failed to consume from queue ${queueName}:`, error);
            throw error;
        }
    }


    async _initializeBroker() {
        try {
            if (!this.connection || !this.channel) {
                console.log(`[${this.name}] Message broker not available, skipping initialization`);
                return;
            }

            console.log(`[${this.name}] Initializing message broker connections`);

            // Setup default queues and exchanges here if needed

        } catch (error) {
            console.error(`[${this.name}] Failed to initialize message broker:`, error);
            throw error;
        }
    }

    _registerProcessEvents() {
        // Handle graceful shutdown
        process.on('SIGTERM', async () => {
            console.log(`[${this.name}] SIGTERM received, shutting down gracefully`);
            await this.stop();
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            console.log(`[${this.name}] SIGINT received, shutting down gracefully`);
            await this.stop();
            process.exit(0);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error(`[${this.name}] Uncaught exception:`, error);
            await this.stop();
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', async (reason, promise) => {
            console.error(`[${this.name}] Unhandled promise rejection:`, reason);
            await this.stop();
            process.exit(1);
        });
    }


    async _cleanup() {
        try {
            // Close any open connections, etc.
            console.log(`[${this.name}] Cleaning up resources`);

            // Implement specific cleanup logic in derived classes

        } catch (error) {
            console.error(`[${this.name}] Error during cleanup:`, error);
            throw error;
        }
    }
}

module.exports = BaseService; 