const ServiceRegistry = require('./ServiceRegistry');
const BaseService = require('./BaseService');
const path = require('path');
const os = require('os');

/**
 * Service Factory
 * Creates and manages service instances using the factory pattern
 */
class ServiceFactory {
    /**
     * Create a new ServiceFactory
     * @param {Object} options - Factory options
     */
    constructor(options = {}) {
        this.options = options;
        this.services = {};
        this.registry = new ServiceRegistry({
            timeout: options.registryTimeout || 30000,
            cleanupInterval: options.registryCleanupInterval || 300000
        });

        // Available service types and their paths
        this.serviceTypes = {
            'api-gateway': './api-gateway',
            'api': './api',
            'otp': './otp'
            // Add more service types as needed
        };

        console.log('ServiceFactory initialized');
    }

    /**
     * Create a service instance
     * @param {string} type - Service type
     * @param {Object} options - Service options
     * @returns {Promise<Object>} Service instance
     */
    async createService(type, options = {}) {
        try {
            if (!type) {
                throw new Error('Service type is required');
            }

            // Check if service type is supported
            if (!this.serviceTypes[type]) {
                throw new Error(`Unsupported service type: ${type}`);
            }

            // Initialize message broker if needed
            const messageBroker = await this._initializeMessageBroker(type);

            // Generate service ID
            const serviceId = `${type}-${Date.now()}`;

            // Create service options
            const serviceOptions = {
                name: type,
                port: options.port || this._getDefaultPort(type),
                connection: messageBroker?.connection,
                channel: messageBroker?.channel,
                configPath: options.configPath || this._getConfigPath(type, options.env),
                env: options.env || process.env.NODE_ENV || 'development',
                registry: this.registry,
                ...options
            };

            // Import service class from its directory
            const ServiceClass = require(this.serviceTypes[type]);

            // Create service instance
            const service = new ServiceClass(serviceOptions);

            // Store service instance
            this.services[serviceId] = service;

            console.log(`Created service: ${type} (${serviceId})`);
            return service;
        } catch (error) {
            console.error(`Failed to create service ${type}:`, error);
            throw error;
        }
    }

    /**
     * Get a service instance by ID
     * @param {string} serviceId - Service ID
     * @returns {Object|null} Service instance or null if not found
     */
    getService(serviceId) {
        return this.services[serviceId] || null;
    }

    /**
     * Get all service instances
     * @returns {Object} Map of service instances
     */
    getAllServices() {
        return this.services;
    }

    /**
     * Get service registry
     * @returns {ServiceRegistry} Service registry instance
     */
    getRegistry() {
        return this.registry;
    }

    /**
     * Get default port for a service type
     * @param {string} type - Service type
     * @returns {number} Default port
     * @private
     */
    _getDefaultPort(type) {
        const portMap = {
            'api-gateway': 3000,
            'api': 3001,
            'otp': 3002
            // Add more service types as needed
        };

        return portMap[type] || 3000;
    }

    /**
     * Get config path for a service type
     * @param {string} type - Service type
     * @param {string} env - Environment
     * @returns {string} Config path
     * @private
     */
    _getConfigPath(type, env = 'development') {
        return path.join(process.cwd(), 'config', `${env}-service-config.json`);
    }

    /**
     * Initialize message broker
     * @param {string} type - Service type
     * @returns {Promise<Object|null>} Message broker or null if not needed
     * @private
     */
    async _initializeMessageBroker(type) {
        try {
            // Skip message broker initialization for API Gateway
            if (type === 'api-gateway') {
                return null;
            }

            const RabbitmqConfig = require('../config/rabbitmq');
            await RabbitmqConfig.connect();

            return {
                connection: RabbitmqConfig.connection,
                channel: RabbitmqConfig.channel
            };
        } catch (error) {
            console.error('Error initializing message broker:', error);
            throw error;
        }
    }
}

// Create singleton instance
const serviceFactory = new ServiceFactory();

module.exports = serviceFactory; 