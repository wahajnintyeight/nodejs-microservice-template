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

# Start API Gateway and API service (development)
npm run start:gateway-api:dev

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
    // Add service-specific options here
    interval: parseInt(process.env.MY_SERVICE_INTERVAL || "60000"),
    maxRetries: parseInt(process.env.MY_SERVICE_MAX_RETRIES || "3"),
  },
};

module.exports = config;
```

### 3. Create Service Implementation

Below are examples for different types of specialized services:

#### Example A: Task Processing Service

Create `services/task-processor/index.js`:

```javascript
const BaseService = require("../BaseService");
const config = require("./config");

class TaskProcessorService extends BaseService {
  constructor(options = {}) {
    super({
      name: config.service.name,
      port: options.port || config.server.port,
      ...options,
    });

    this.config = config;
    this.processingQueue = [];
    this.isProcessing = false;
  }

  async start() {
    try {
      await super.start();

      // Initialize message broker connections
      if (this.connection && this.channel) {
        await this._setupQueues();
      }

      // Start processing tasks
      this._startProcessing();

      console.log(`[${this.name}] Service started successfully`);
    } catch (error) {
      console.error(`[${this.name}] Failed to start service:`, error);
      throw error;
    }
  }

  async stop() {
    try {
      // Stop processing tasks
      this._stopProcessing();

      // Call parent stop method
      await super.stop();

      console.log(`[${this.name}] Service stopped successfully`);
    } catch (error) {
      console.error(`[${this.name}] Failed to stop service:`, error);
      throw error;
    }
  }

  async _setupQueues() {
    try {
      await this.registerQueue(this.config.queues.requests);
      await this.registerQueue(this.config.queues.responses);

      // Listen for task requests
      await this.consumeFromQueue(
        this.config.queues.requests,
        async (message) => {
          console.log(`[${this.name}] Received task:`, message);

          try {
            // Add task to processing queue
            this.processingQueue.push(message);

            // Acknowledge receipt
            await this.publishToQueue(this.config.queues.responses, {
              correlationId: message.correlationId,
              success: true,
              status: "queued",
              message: "Task queued for processing",
            });
          } catch (error) {
            console.error(`[${this.name}] Error handling task:`, error);
            await this.publishToQueue(this.config.queues.responses, {
              correlationId: message.correlationId,
              success: false,
              error: error.message,
            });
          }
        }
      );

      console.log(`[${this.name}] Message broker queues setup complete`);
    } catch (error) {
      console.error(
        `[${this.name}] Failed to setup message broker queues:`,
        error
      );
      throw error;
    }
  }

  _startProcessing() {
    this.processingInterval = setInterval(() => {
      this._processNextTask();
    }, 1000); // Check for new tasks every second

    console.log(`[${this.name}] Task processing started`);
  }

  _stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log(`[${this.name}] Task processing stopped`);
    }
  }

  async _processNextTask() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const task = this.processingQueue.shift();

    try {
      console.log(`[${this.name}] Processing task:`, task.id);

      // Simulate task processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Send completion notification
      await this.publishToQueue(this.config.queues.responses, {
        correlationId: task.correlationId,
        success: true,
        status: "completed",
        result: `Task ${task.id} processed successfully`,
      });

      console.log(`[${this.name}] Task completed:`, task.id);
    } catch (error) {
      console.error(`[${this.name}] Task processing error:`, error);

      // Send error notification
      await this.publishToQueue(this.config.queues.responses, {
        correlationId: task.correlationId,
        success: false,
        status: "failed",
        error: error.message,
      });
    } finally {
      this.isProcessing = false;
    }
  }

  async _cleanup() {
    try {
      this._stopProcessing();
      console.log(`[${this.name}] Cleaning up resources`);
      await super._cleanup();
    } catch (error) {
      console.error(`[${this.name}] Error during cleanup:`, error);
      throw error;
    }
  }
}

module.exports = TaskProcessorService;
```

#### Example B: Cron Service

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

      // Call parent stop method
      await super.stop();

      console.log(`[${this.name}] Service stopped successfully`);
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
          console.log(`[${this.name}] Received job request:`, message);

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
            console.error(`[${this.name}] Error handling job request:`, error);
            await this.publishToQueue(this.config.queues.responses, {
              correlationId: message.correlationId,
              success: false,
              error: error.message,
            });
          }
        }
      );

      console.log(`[${this.name}] Message broker queues setup complete`);
    } catch (error) {
      console.error(
        `[${this.name}] Failed to setup message broker queues:`,
        error
      );
      throw error;
    }
  }

  _initializeJobs() {
    // Schedule predefined jobs from configuration
    const predefinedJobs = this.config.jobs || [];

    predefinedJobs.forEach((job) => {
      this._scheduleJob(job.id, job.schedule, job.data);
    });

    console.log(
      `[${this.name}] Initialized ${predefinedJobs.length} predefined jobs`
    );
  }

  _scheduleJob(jobId, schedule, jobData) {
    // Cancel existing job with same ID if exists
    this._cancelJob(jobId);

    // Parse cron schedule
    const [minute, hour, dayOfMonth, month, dayOfWeek] = schedule.split(" ");

    // Calculate next run time (simplified example)
    const now = new Date();
    const nextRun = new Date(now.getTime() + 60000); // Just for example, run in 1 minute

    // Create job timer
    const timer = setTimeout(() => {
      this._executeJob(jobId, jobData);
    }, nextRun.getTime() - now.getTime());

    // Store job
    this.scheduledJobs.set(jobId, {
      id: jobId,
      schedule,
      data: jobData,
      nextRun,
      timer,
    });

    console.log(`[${this.name}] Scheduled job ${jobId} to run at ${nextRun}`);
  }

  _cancelJob(jobId) {
    const job = this.scheduledJobs.get(jobId);

    if (job) {
      clearTimeout(job.timer);
      this.scheduledJobs.delete(jobId);
      console.log(`[${this.name}] Cancelled job ${jobId}`);
      return true;
    }

    return false;
  }

  async _executeJob(jobId, jobData) {
    try {
      console.log(`[${this.name}] Executing job ${jobId}`);

      // Publish job execution notification
      await this.publishToQueue("cron.notifications", {
        jobId,
        status: "executing",
        timestamp: new Date().toISOString(),
        data: jobData,
      });

      // Simulate job execution
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Publish job completion notification
      await this.publishToQueue("cron.notifications", {
        jobId,
        status: "completed",
        timestamp: new Date().toISOString(),
        result: `Job ${jobId} executed successfully`,
      });

      // Reschedule job if it's recurring
      const job = this.scheduledJobs.get(jobId);
      if (job) {
        this._scheduleJob(jobId, job.schedule, job.data);
      }
    } catch (error) {
      console.error(`[${this.name}] Error executing job ${jobId}:`, error);

      // Publish job error notification
      await this.publishToQueue("cron.notifications", {
        jobId,
        status: "failed",
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  _stopAllJobs() {
    let count = 0;

    for (const [jobId, job] of this.scheduledJobs.entries()) {
      clearTimeout(job.timer);
      this.scheduledJobs.delete(jobId);
      count++;
    }

    console.log(`[${this.name}] Stopped ${count} scheduled jobs`);
  }

  async _cleanup() {
    try {
      this._stopAllJobs();
      console.log(`[${this.name}] Cleaning up resources`);
      await super._cleanup();
    } catch (error) {
      console.error(`[${this.name}] Error during cleanup:`, error);
      throw error;
    }
  }
}

module.exports = CronService;
```

### 6. Update ServiceFactory.js

Add your service to the `serviceTypes` object in `ServiceFactory.js`:

```javascript
// In ServiceFactory.js
const TaskProcessorService = require("./task-processor");
const CronService = require("./cron");

// In serviceTypes object
const serviceTypes = {
  "api-gateway": ApiGatewayService,
  api: APIService,
  otp: OTPService,
  "task-processor": TaskProcessorService,
  cron: CronService,
};
```

### 7. Update Environment Variables

Add your service's environment variables to `.env`:

```
# Task Processor Service
TASK_PROCESSOR_PORT=3003
TASK_PROCESSOR_HOST=localhost
TASK_PROCESSOR_LOG_LEVEL=debug
TASK_PROCESSOR_VERSION=1.0.0
TASK_PROCESSOR_MAX_CONCURRENT=5

# Cron Service
CRON_PORT=3004
CRON_HOST=localhost
CRON_LOG_LEVEL=debug
CRON_VERSION=1.0.0
```

### 8. Add npm Script

Add scripts to `package.json` to start your services:

```json
"scripts": {
  "start:task-processor": "node index.js -s=task-processor",
  "start:cron": "node index.js -s=cron"
}
```

### 9. Update run-services.js (Optional)

If you want your services to be started with the others, add them to the services array in `scripts/run-services.js`:

```javascript
const services = [
  // Existing services
  {
    name: "task-processor",
    port: parseInt(process.env.TASK_PROCESSOR_PORT || "3003"),
    color: "\x1b[35m", // Magenta
    required: false,
  },
  {
    name: "cron",
    port: parseInt(process.env.CRON_PORT || "3004"),
    color: "\x1b[90m", // Gray
    required: false,
  },
];
```

### 10. Test Your Service

Start your service:

```bash
npm run start:task-processor
# or
npm run start:cron
```

Or start all services including yours:

```bash
npm run start:all
```

### 11. Response Messages

# Response Utility

This utility provides a standardized way to send API responses, ensuring consistency across all endpoints.

## Usage

The Response class is automatically attached to the `res` object as `res.api` via middleware. You can use it in your controllers like this:

```javascript
// Success responses
res.api.success(data, message); // 200 OK
res.api.created(data, message); // 201 Created
res.api.updated(data, message); // 200 OK with update message
res.api.deleted(message); // 200 OK with delete message
res.api.noContent(); // 204 No Content

// Error responses
res.api.badRequest(message, errors); // 400 Bad Request
res.api.unauthorized(message, errors); // 401 Unauthorized
res.api.forbidden(message, errors); // 403 Forbidden
res.api.notFound(message, errors); // 404 Not Found
res.api.conflict(message, errors); // 409 Conflict
res.api.tooMany(message, errors); // 429 Too Many Requests
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
