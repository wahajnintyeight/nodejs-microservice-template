# Node.js Microservices Architecture

Microservices architecture using Node.js and Express.js with API Gateway entry point. Implements factory pattern for service management.

## Features

- API Gateway as central entry point
- Microservices Architecture
- Service Registry & Discovery
- Factory Pattern
- OOP Design
- Validation with Joi
- Centralized error handling
- Logging with Winston
- Environment-specific configuration
- Security with Helmet and rate limiting

## Project Structure

```
├── config/                 # Configuration files
├── controllers/            # Request handlers
├── routes/                 # API routes
├── middleware/             # Express middleware
├── models/                 # Data models
├── scripts/                # Utility scripts
├── services/               # Microservices
│   ├── api/                # API service (HTTP endpoints)
│   ├── api-gateway/        # API Gateway service
│   ├── otp/                # OTP service (OTP generation/verification)
│   ├── BaseService.js      # Base service class
│   ├── ServiceFactory.js   # Service factory
│   ├── ServiceRegistry.js  # Service registry
├── utils/                  # Utility functions
├── .env                    # Environment variables
├── index.js                # Entry point
└── package.json            # Dependencies
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm (v6+)
- RabbitMQ

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd node-server-template
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

### Running Services

#### API Gateway

```bash
# Development mode
npm run dev

# Production mode
npm start
```

#### Individual Services

```bash
# Start API service
npm run start:api

# Start OTP service
npm run start:otp
```

#### Running Multiple Services

```bash
# Start API Gateway and API service (production)
npm run start:gateway-api

# Start all services (production)
npm run start:all

# Start all services (development)
npm run start:all:dev
```

#### Custom Service Configuration

```bash
# Format: node index.js -s=<service-name> -p=<port> -e=<environment> -v=<version>
node index.js -s=api-gateway -p=3000
node index.js -s=api -p=3001
node index.js -s=otp -p=3002
```

## Service Registry

Services automatically register with the registry on startup and are discoverable by other services.

- `GET /api/v1/services`: List registered services

## API Endpoints

### API Gateway

- `GET /api/v1`: API information
- `GET /health`: Health check
- `GET /api/v1/services`: Service discovery

### Example Service

- `GET /api/v1/examples`: Get all examples
- `GET /api/v1/examples/:id`: Get example by ID
- `POST /api/v1/examples`: Create example
- `PUT /api/v1/examples/:id`: Update example
- `DELETE /api/v1/examples/:id`: Delete example

## Adding a New Microservice

1. Create service class extending `BaseService`
2. Add service type to `serviceTypes` in `ServiceFactory.js`
3. Implement service-specific logic
4. Add script in `package.json`

## Creating a New Service

Follow these steps to create a new microservice. Note that in this architecture, only the API service handles HTTP endpoints, while other services perform specialized functions (OTP generation, scheduled tasks, etc.) and communicate via message broker.

### 1. Create Service Directory Structure

```bash
mkdir -p services/my-service/config
```

### 2. Create Service Configuration

Create `services/my-service/config/index.js`:

```javascript
const dotenv = require("dotenv");

dotenv.config();

const config = {
  service: {
    name: "my-service",
    version: process.env.MY_SERVICE_VERSION || "1.0.0",
  },
  server: {
    port: parseInt(process.env.MY_SERVICE_PORT || "3003"),
    host: process.env.MY_SERVICE_HOST || "localhost",
  },
  logging: {
    level: process.env.MY_SERVICE_LOG_LEVEL || "info",
  },
  queues: {
    requests: "my-service.requests",
    responses: "my-service.responses",
  },
  // Service-specific configuration
  myServiceOptions: {
    interval: parseInt(process.env.MY_SERVICE_INTERVAL || "60000"),
    maxRetries: parseInt(process.env.MY_SERVICE_MAX_RETRIES || "3"),
  },
};

module.exports = config;
```

### 3. Create Service Implementation

#### Example: Cron Service

Create `services/cron/index.js`:

```javascript
const BaseService = require("../BaseService");
const config = require("./config");

class CronService extends BaseService {
  constructor(options = {}) {
    super({
      name: config.service.name,
      port: options.port || config.server.port,
      ...options,
    });

    this.config = config;
    this.scheduledJobs = new Map();
  }

  async start() {
    try {
      await super.start();

      // Initialize message broker connections
      if (this.connection && this.channel) {
        await this._setupQueues();
      }

      // Initialize scheduled jobs
      this._initializeJobs();

      console.log(`[${this.name}] Service started successfully`);
    } catch (error) {
      console.error(`[${this.name}] Failed to start service:`, error);
      throw error;
    }
  }

  async stop() {
    try {
      // Stop all scheduled jobs
      this._stopAllJobs();
      await super.stop();
    } catch (error) {
      console.error(`[${this.name}] Failed to stop service:`, error);
      throw error;
    }
  }

  async _setupQueues() {
    try {
      await this.registerQueue(this.config.queues.requests);
      await this.registerQueue(this.config.queues.responses);
      await this.registerQueue("cron.notifications");

      // Listen for job management requests
      await this.consumeFromQueue(
        this.config.queues.requests,
        async (message) => {
          try {
            if (message.action === "schedule") {
              this._scheduleJob(message.jobId, message.schedule, message.data);
              await this.publishToQueue(this.config.queues.responses, {
                correlationId: message.correlationId,
                success: true,
                jobId: message.jobId,
                status: "scheduled",
              });
            } else if (message.action === "cancel") {
              this._cancelJob(message.jobId);
              await this.publishToQueue(this.config.queues.responses, {
                correlationId: message.correlationId,
                success: true,
                jobId: message.jobId,
                status: "cancelled",
              });
            } else {
              throw new Error(`Unknown action: ${message.action}`);
            }
          } catch (error) {
            await this.publishToQueue(this.config.queues.responses, {
              correlationId: message.correlationId,
              success: false,
              error: error.message,
            });
          }
        }
      );
    } catch (error) {
      throw error;
    }
  }

  _initializeJobs() {
    const predefinedJobs = this.config.jobs || [];
    predefinedJobs.forEach((job) => {
      this._scheduleJob(job.id, job.schedule, job.data);
    });
  }

  // Other methods omitted for brevity
}

module.exports = CronService;
```

### 4. Update ServiceFactory.js

Add your service to the `serviceTypes` object in `ServiceFactory.js`:

```javascript
// In serviceTypes object
const serviceTypes = {
  "api-gateway": ApiGatewayService,
  api: APIService,
  otp: OTPService,
  cron: CronService,
};
```

### 5. Update Environment Variables

Add your service's environment variables to `.env`:

```
# Cron Service
CRON_PORT=3004
CRON_HOST=localhost
CRON_LOG_LEVEL=debug
CRON_VERSION=1.0.0
```

### 6. Add npm Script

Add scripts to `package.json` to start your services:

```json
"scripts": {
  "start:cron": "node index.js -s=cron"
}
```

## Response Utility

This utility provides a standardized way to send API responses, ensuring consistency across all endpoints.

### Usage

The Response class is automatically attached to the `res` object as `res.api` via middleware:

```javascript
// Success responses
res.api.success(data, message); // 200 OK
res.api.created(data, message); // 201 Created
res.api.updated(data, message); // 200 OK with update message
res.api.deleted(message); // 200 OK with delete message

// Error responses
res.api.badRequest(message, errors); // 400 Bad Request
res.api.unauthorized(message, errors); // 401 Unauthorized
res.api.notFound(message, errors); // 404 Not Found
res.api.internalError(message, errors); // 500 Internal Server Error

// Custom responses
res.api.send(data, message, statusCode); // Any status code
res.api.error(message, statusCode, errors); // Any error status code
res.api.stream(data, contentType); // Stream response
res.api.file(path, filename); // File download
res.api.redirect(url, statusCode); // Redirect
res.api.custom(statusCode, data); // Custom response
```

## Examples

### Success Response

```javascript
const getUserProfile = (req, res) => {
  try {
    const user = { id: 1, name: "John Doe", email: "john@example.com" };
    return res.api.success(user, "User profile retrieved successfully");
  } catch (error) {
    return res.api.internalError("Failed to retrieve user profile");
  }
};
```

Response:

```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Error Response

```javascript
const createUser = (req, res) => {
  try {
    const { name, email, password } = req.body;

    const errors = [];
    if (!name) errors.push({ field: "name", message: "Name is required" });
    if (!email) errors.push({ field: "email", message: "Email is required" });
    if (!password)
      errors.push({ field: "password", message: "Password is required" });

    if (errors.length > 0) {
      return res.api.badRequest("Validation failed", errors);
    }

    // Create user logic...

    return res.api.created({ id: 123 }, "User created successfully");
  } catch (error) {
    return res.api.internalError("Failed to create user");
  }
};
```

Error Response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "Name is required" },
    { "field": "email", "message": "Email is required" },
    { "field": "password", "message": "Password is required" }
  ]
}
```

Success Response:

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 123
  }
}
```

## License

ISC License
