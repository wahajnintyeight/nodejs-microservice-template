const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const BaseService = require('../BaseService');
const config = require('./config');
const otpRoutes = require('../../routes/otp.routes');

class OTPService extends BaseService {
    constructor(options = {}) {
        super({
            name: config.service.name,
            port: options.port || config.server.port,
            ...options
        });

        this.config = config;
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
            console.error(`[${this.name}] Failed to start OTP service:`, error);
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
            console.error(`[${this.name}] Failed to stop OTP service:`, error);
            throw error;
        }
    }


    async _setupQueues() {
        try {
            await this.registerQueue(this.config.queues.requests);
            await this.registerQueue(this.config.queues.responses);

            await this.consumeFromQueue(this.config.queues.requests, async (message) => {
                console.log(`[${this.name}] Received request:`, message);

                try {
                    if (message.action === 'generate' || message.action === 'verify') {
                        await this.publishToQueue(this.config.queues.responses, {
                            correlationId: message.correlationId,
                            success: true,
                            action: message.action,
                            result: `${message.action} processed`
                        });
                    } else {
                        throw new Error(`Unknown action: ${message.action}`);
                    }
                } catch (error) {
                    console.error(`[${this.name}] Error processing message:`, error);

                    await this.publishToQueue(this.config.queues.responses, {
                        correlationId: message.correlationId,
                        success: false,
                        error: error.message
                    });
                }
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

module.exports = OTPService;