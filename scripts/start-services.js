#!/usr/bin/env node

/**
 * Script to start all services in the microservices architecture
 * 
 * Usage:
 *   node scripts/start-services.js [--dev] [--all]
 * 
 * Options:
 *   --dev     Start services in development mode
 *   --all     Start all available services
 *   --help    Show help
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const startAll = args.includes('--all');
const showHelp = args.includes('--help');

// Define services to start
const services = [
    { name: 'api-gateway', port: 3000, color: '\x1b[36m' }, // Cyan
    { name: 'api', port: 3001, color: '\x1b[32m' },         // Green
    { name: 'otp', port: 3002, color: '\x1b[33m' }          // Yellow
    // Add more services as needed
];

// Show help
if (showHelp) {
    console.log(`
Usage:
  node scripts/start-services.js [--dev] [--all]

Options:
  --dev     Start services in development mode
  --all     Start all available services
  --help    Show this help message

Examples:
  # Start API Gateway and API service in production mode
  node scripts/start-services.js

  # Start all services in development mode
  node scripts/start-services.js --dev --all
    `);
    process.exit(0);
}

// Filter services if not starting all
const servicesToStart = startAll ? services : services.slice(0, 2);

// Log startup
console.log('\x1b[1m%s\x1b[0m', '🚀 Starting microservices...');
console.log('\x1b[1m%s\x1b[0m', `🔧 Environment: ${isDev ? 'development' : 'production'}`);
console.log('\x1b[1m%s\x1b[0m', `📋 Services: ${servicesToStart.map(s => s.name).join(', ')}`);
console.log('---------------------------------------------------');

// Start each service
const children = [];
servicesToStart.forEach(service => {
    // Build command arguments
    const args = [
        'index.js',
        `-s=${service.name}`,
        `-p=${service.port}`,
        `-e=${isDev ? 'development' : 'production'}`,
        '-v=1.0.0'
    ];

    // Spawn process
    const child = spawn('node', args, {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'pipe',
        detached: false
    });

    // Store child process
    children.push({
        process: child,
        name: service.name,
        color: service.color
    });

    // Handle stdout
    child.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            console.log(`${service.color}[${service.name}]\x1b[0m ${line}`);
        });
    });

    // Handle stderr
    child.stderr.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            console.error(`${service.color}[${service.name}]\x1b[0m \x1b[31m${line}\x1b[0m`);
        });
    });

    // Handle exit
    child.on('exit', (code, signal) => {
        console.log(`${service.color}[${service.name}]\x1b[0m Service exited with code ${code}`);
    });
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\x1b[1m%s\x1b[0m', '🛑 Shutting down all services...');

    // Kill all child processes
    children.forEach(child => {
        if (child.process && !child.process.killed) {
            console.log(`${child.color}[${child.name}]\x1b[0m Stopping service...`);
            process.kill(-child.process.pid);
        }
    });

    console.log('\x1b[1m%s\x1b[0m', '👋 Goodbye!');
    process.exit(0);
});

console.log('\x1b[1m%s\x1b[0m', '✅ All services started');
console.log('\x1b[1m%s\x1b[0m', '📝 Press Ctrl+C to stop all services'); 