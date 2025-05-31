#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

try {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log('\x1b[1m%s\x1b[0m', '📄 Loaded environment variables from .env file');
    } else {
        console.warn('\x1b[33m%s\x1b[0m', '⚠️  No .env file found, using default environment variables');
        dotenv.config();
    }
} catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `❌ Error loading environment variables: ${error.message}`);
    process.exit(1);
}

const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const startAll = args.includes('--all');
const showHelp = args.includes('--help');

const services = [
    {
        name: 'api-gateway',
        port: parseInt(process.env.PORT || process.env.GATEWAY_PORT || '3000'),
        color: '\x1b[36m',
        required: true
    },
    {
        name: 'api',
        port: parseInt(process.env.API_PORT || '3001'),
        color: '\x1b[32m',
        required: true
    },
    {
        name: 'otp',
        port: parseInt(process.env.OTP_PORT || '3002'),
        color: '\x1b[33m',
        required: false
    }
];

if (showHelp) {
    console.log(`
Usage:
  node scripts/run-services.js [--dev] [--all]

Options:
  --dev     Start services in development mode
  --all     Start all available services
  --help    Show this help message

Examples:
  # Start API Gateway and API service in production mode
  node scripts/run-services.js

  # Start all services in development mode
  node scripts/run-services.js --dev --all
    `);
    process.exit(0);
}

const servicesToStart = startAll ? services : services.filter(s => s.required);

try {
    servicesToStart.forEach(service => {
        if (!service.port || isNaN(service.port)) {
            throw new Error(`Invalid port configuration for ${service.name} service: ${service.port}`);
        }
    });
} catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `❌ Configuration error: ${error.message}`);
    console.error('\x1b[31m%s\x1b[0m', '   Please check your .env file and make sure all required environment variables are set');
    process.exit(1);
}

console.log('\x1b[1m%s\x1b[0m', '🚀 Starting microservices...');
console.log('\x1b[1m%s\x1b[0m', `🔧 Environment: ${isDev ? 'development' : 'production'}`);
console.log('\x1b[1m%s\x1b[0m', `📋 Services: ${servicesToStart.map(s => `${s.name} (port ${s.port})`).join(', ')}`);
console.log('---------------------------------------------------');

const children = [];
let startupErrors = 0;

servicesToStart.forEach(service => {
    try {
        const args = [
            'index.js',
            `-s=${service.name}`,
            `-p=${service.port}`,
            `-e=${isDev ? 'development' : 'production'}`,
            '-v=1.0.0'
        ];

        const child = spawn('node', args, {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'pipe',
            detached: false,
            env: {
                ...process.env,
                PORT: service.port.toString()
            }
        });

        children.push({
            process: child,
            name: service.name,
            color: service.color,
            startTime: Date.now(),
            required: service.required
        });

        child.stdout.on('data', (data) => {
            const lines = data.toString().trim().split('\n');
            lines.forEach(line => {
                console.log(`${service.color}[${service.name}]\x1b[0m ${line}`);
            });
        });

        child.stderr.on('data', (data) => {
            const lines = data.toString().trim().split('\n');
            lines.forEach(line => {
                console.error(`${service.color}[${service.name}]\x1b[0m \x1b[31m${line}\x1b[0m`);
            });
        });

        child.on('exit', (code, signal) => {
            const serviceInfo = children.find(c => c.process === child);
            if (serviceInfo) {
                const uptime = ((Date.now() - serviceInfo.startTime) / 1000).toFixed(2);

                if (code === 0) {
                    console.log(`${service.color}[${service.name}]\x1b[0m Service exited normally after ${uptime}s`);
                } else {
                    console.error(`${service.color}[${service.name}]\x1b[0m \x1b[31mService exited with code ${code} after ${uptime}s\x1b[0m`);

                    if (serviceInfo.required && uptime < 5) {
                        startupErrors++;
                        console.error(`${service.color}[${service.name}]\x1b[0m \x1b[31mCritical service failed to start properly\x1b[0m`);

                        if (startupErrors >= servicesToStart.filter(s => s.required).length) {
                            console.error('\x1b[31m%s\x1b[0m', '❌ All required services failed to start. Shutting down...');
                            process.exit(1);
                        }
                    }
                }
            }
        });

        child.on('error', (err) => {
            console.error(`${service.color}[${service.name}]\x1b[0m \x1b[31mFailed to start service: ${err.message}\x1b[0m`);
            if (service.required) {
                startupErrors++;
                if (startupErrors >= servicesToStart.filter(s => s.required).length) {
                    console.error('\x1b[31m%s\x1b[0m', '❌ All required services failed to start. Shutting down...');
                    process.exit(1);
                }
            }
        });
    } catch (error) {
        console.error(`${service.color}[${service.name}]\x1b[0m \x1b[31mError starting service: ${error.message}\x1b[0m`);
        if (service.required) {
            startupErrors++;
            if (startupErrors >= servicesToStart.filter(s => s.required).length) {
                console.error('\x1b[31m%s\x1b[0m', '❌ All required services failed to start. Shutting down...');
                process.exit(1);
            }
        }
    }
});

if (children.length === 0) {
    console.error('\x1b[31m%s\x1b[0m', '❌ No services were started. Exiting...');
    process.exit(1);
}

process.on('SIGINT', () => {
    console.log('\n\x1b[1m%s\x1b[0m', '🛑 Shutting down all services...');

    let pendingKills = children.length;

    if (pendingKills === 0) {
        console.log('\x1b[1m%s\x1b[0m', '👋 Goodbye!');
        process.exit(0);
    }

    children.forEach(child => {
        if (child.process && !child.process.killed) {
            console.log(`${child.color}[${child.name}]\x1b[0m Stopping service...`);
            try {
                process.kill(-child.process.pid);
            } catch (error) {
                console.error(`${child.color}[${child.name}]\x1b[0m \x1b[31mError stopping service: ${error.message}\x1b[0m`);
            } finally {
                pendingKills--;
                if (pendingKills === 0) {
                    console.log('\x1b[1m%s\x1b[0m', '👋 Goodbye!');
                    process.exit(0);
                }
            }
        } else {
            pendingKills--;
            if (pendingKills === 0) {
                console.log('\x1b[1m%s\x1b[0m', '👋 Goodbye!');
                process.exit(0);
            }
        }
    });

    setTimeout(() => {
        console.error('\x1b[31m%s\x1b[0m', '⚠️ Force exiting after timeout...');
        process.exit(1);
    }, 5000);
});

process.on('uncaughtException', (error) => {
    console.error('\x1b[31m%s\x1b[0m', `❌ Uncaught exception: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\x1b[31m%s\x1b[0m', '❌ Unhandled promise rejection:', reason);
    process.exit(1);
});

console.log('\x1b[1m%s\x1b[0m', '✅ All services started');
console.log('\x1b[1m%s\x1b[0m', '📝 Press Ctrl+C to stop all services');