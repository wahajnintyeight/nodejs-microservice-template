# Scripts Directory

Utility scripts for the microservices project.

## Available Scripts

### run-services.js

Run multiple services simultaneously with proper logging and process management.

#### Usage

```bash
node scripts/run-services.js [--dev] [--all] [--help]
```

#### Options

- `--dev`: Start services in development mode
- `--all`: Start all available services (API Gateway, API Service, OTP Service)
- `--help`: Show help information

#### Examples

```bash
# Start API Gateway and API service in production mode
npm run start:gateway-api

# Start API Gateway and API service in development mode
npm run start:gateway-api:dev

# Start all services in production mode
npm run start:all

# Start all services in development mode
npm run start:all:dev
```

## Adding New Scripts

When adding new scripts:

1. Include proper documentation and help text
2. Add npm scripts in package.json
3. Include error handling and graceful shutdown
4. Update this README
