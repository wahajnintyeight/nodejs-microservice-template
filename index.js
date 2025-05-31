const dotenv = require('dotenv');
const path = require('path');
const serviceFactory = require('./services/ServiceFactory');

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
    console.error('Invalid arguments. Please provide service name (e.g., -s=api-gateway).');
    process.exit(1);
}

let serviceName;
let port;
let env = 'development';


args.forEach(arg => {
    if (arg.startsWith('-s=')) {
        serviceName = arg.substring(3).toLowerCase();
    } else if (arg.startsWith('-e=')) {
        env = arg.substring(3).toLowerCase();
    }
});

if (!serviceName) {
    console.error('Invalid arguments. Please provide service name (e.g., -s=api-gateway).');
    process.exit(1);
}

// Set environment
process.env.NODE_ENV = env;

/**
 * Main function to start the application
 */
async function main() {
    try {
        console.log(`Starting ${serviceName} service in ${env} environment${port ? ` on port ${port}` : ''}`);

        const service = await serviceFactory.createService(serviceName, {
            port,
            env,
        });


        if (service && typeof service.start === 'function') {
            await service.start();
            console.log(`Service ${serviceName} started successfully${port ? ` on port ${port}` : ''}`);

            // Print registry status if available
            const registry = serviceFactory.getRegistry();
            if (registry) {
                const services = registry.getAll();
                if (services.length > 0) {
                    console.log('Registered services:');
                    services.forEach(svc => {
                        console.log(`- ${svc.name}@${svc.version} (${svc.host}:${svc.port})`);
                    });
                }
            }
        } else {
            throw new Error(`Invalid service instance for ${serviceName}`);
        }
    } catch (error) {
        console.error(`Failed to start ${serviceName} service:`, error);
        process.exit(1);
    }
}

// Start the application
main().catch(err => {
    console.error("An error occurred:", err);
    process.exit(1);
});