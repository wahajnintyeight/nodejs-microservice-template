/**
 * Service Registry
 * Manages service registration and discovery
 */
class ServiceRegistry {

    constructor(options = {}) {
        this.services = {};
        this.timeout = options.timeout || 30000; // Default 30 seconds
        this.cleanupInterval = options.cleanupInterval || 300000; // Default 5 minutes

        // Start cleanup interval
        this._startCleanupInterval();
    }


    register(name, host, port, metadata = {}) {
        if (!name || !host || !port) {
            throw new Error('Service registration requires name, host, and port');
        }

        const key = this._generateKey(name, host, port);
        const timestamp = Date.now();

        // Check if service already exists
        if (this.services[key]) {
            // Update timestamp
            this.services[key].timestamp = timestamp;
            console.log(`Service updated: ${name} at ${host}:${port}`);
            return this.services[key];
        }

        // Register new service
        const service = {
            name,
            host,
            port,
            url: `http://${host}:${port}`,
            timestamp,
            metadata,
            key
        };

        this.services[key] = service;
        console.log(`Service registered: ${name} at ${host}:${port}`);

        return service;
    }


    unregister(name, host, port) {
        const key = this._generateKey(name, host, port);

        if (this.services[key]) {
            delete this.services[key];
            console.log(`Service unregistered: ${name} at ${host}:${port}`);
            return true;
        }

        return false;
    }

    findAll(name) {
        const now = Date.now();

        // Find all services matching name and version
        const services = Object.values(this.services).filter(service => {
            // Check if service is expired
            if (now - service.timestamp > this.timeout) {
                return false;
            }

            // Check name
            return service.name === name;
        });

        return services;
    }


    find(name) {
        const services = this.findAll(name);

        if (services.length === 0) {
            return null;
        }

        // Return a random service from the list for load balancing
        return services[Math.floor(Math.random() * services.length)];
    }


    getAll() {
        return Object.values(this.services);
    }


    _generateKey(name, host, port) {
        return `${name}:${host}:${port}`;
    }


    _startCleanupInterval() {
        setInterval(() => {
            const now = Date.now();
            let count = 0;

            Object.entries(this.services).forEach(([key, service]) => {
                if (now - service.timestamp > this.timeout) {
                    delete this.services[key];
                    count++;
                }
            });

            if (count > 0) {
                console.log(`Cleaned up ${count} expired services`);
            }
        }, this.cleanupInterval);

        console.log(`Started service registry cleanup interval (${this.cleanupInterval}ms)`);
    }
}

module.exports = ServiceRegistry; 