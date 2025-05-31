const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const BaseService = require('../BaseService');
const config = require('./config');
const helloRoutes = require('../../routes/hello.routes');
const responseHandler = require('../../middleware/responseHandler');

class APIService extends BaseService {
    constructor(options = {}) {
        super({
            name: config.service.name,
            port: options.port || config.server.port,
            ...options
        });

        this.app = express();
        this.routes = [];
        this.config = config;

        this._initializeExpress();
    }

    async start() {
        try {
            await super.start();

            this.server = this.app.listen(this.port, () => {
                console.log(`[${this.name}] HTTP server running on port ${this.port}`);
            });

            if (this.connection && this.channel) {
                await this._setupQueues();
            }
        } catch (error) {
            console.error(`[${this.name}] Failed to start API service:`, error);
            throw error;
        }
    }

    async stop() {
        try {
            if (this.server) {
                await new Promise((resolve, reject) => {
                    this.server.close((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`[${this.name}] HTTP server closed`);
                            resolve();
                        }
                    });
                });
            }

            await super.stop();
        } catch (error) {
            console.error(`[${this.name}] Failed to stop API service:`, error);
            throw error;
        }
    }

    _initializeExpress() {
        try {
            this.app.use(helmet());
            this.app.use(cors());
            this.app.use(express.json());
            this.app.use(express.urlencoded({ extended: true }));
            this.app.use(morgan('dev'));

            // Add response handler middleware
            this.app.use(responseHandler);

            this.app.get('/health', (req, res) => {
                res.api.success({ status: 'UP', service: this.name });
            });

            this._setupRoutes();

            this.app.use((req, res, next) => {
                res.api.notFound('Resource not found', { path: req.path });
            });

            this.app.use((err, req, res, next) => {
                console.error(`[${this.name}] Error:`, err);
                const statusCode = err.status || 500;
                const errorData = process.env.NODE_ENV !== 'production' ? { stack: err.stack } : null;

                res.api.error(err.message || 'Internal Server Error', statusCode, errorData);
            });

            console.log(`[${this.name}] Express application initialized`);
        } catch (error) {
            console.error(`[${this.name}] Failed to initialize Express:`, error);
            throw error;
        }
    }

    _setupRoutes() {
        try {
            this.app.get('/', (req, res) => {
                res.api.success({
                    service: this.name,
                    version: this.version,
                    endpoints: this.routes.map(route => `${route.method.toUpperCase()} ${route.path}`)
                });
            });

            this.app.use('/api/hello', helloRoutes);

            console.log(`[${this.name}] API routes setup complete`);
        } catch (error) {
            console.error(`[${this.name}] Failed to setup API routes:`, error);
            throw error;
        }
    }

    async _setupQueues() {
        try {
            await this.registerQueue(this.config.queues.requests);
            await this.registerQueue(this.config.queues.responses);

            await this.consumeFromQueue(this.config.queues.responses, async (message) => {
                console.log(`[${this.name}] Received response:`, message);
            });

            console.log(`[${this.name}] Message broker queues setup complete`);
        } catch (error) {
            console.error(`[${this.name}] Failed to setup message broker queues:`, error);
            throw error;
        }
    }

    async _cleanup() {
        try {
            console.log(`[${this.name}] Cleaning up resources`);

            await super._cleanup();
        } catch (error) {
            console.error(`[${this.name}] Error during cleanup:`, error);
            throw error;
        }
    }
}

module.exports = APIService;