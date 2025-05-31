/**
 * Custom Error class for API errors
 */
class CustomError extends Error {
    /**
     * Create a new CustomError
     * @param {string} code - Error code
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     */
    constructor(code, message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation Error class
 * @extends CustomError
 */
class ValidationError extends CustomError {
    /**
     * Create a new ValidationError
     * @param {string} message - Error message
     * @param {Object} errors - Validation errors
     */
    constructor(message, errors = {}) {
        super('VALIDATION_ERROR', message, 400);
        this.errors = errors;
    }
}

/**
 * Authentication Error class
 * @extends CustomError
 */
class AuthenticationError extends CustomError {
    /**
     * Create a new AuthenticationError
     * @param {string} message - Error message
     */
    constructor(message = 'Authentication failed') {
        super('AUTHENTICATION_ERROR', message, 401);
    }
}

/**
 * Authorization Error class
 * @extends CustomError
 */
class AuthorizationError extends CustomError {
    /**
     * Create a new AuthorizationError
     * @param {string} message - Error message
     */
    constructor(message = 'Not authorized') {
        super('AUTHORIZATION_ERROR', message, 403);
    }
}

/**
 * Not Found Error class
 * @extends CustomError
 */
class NotFoundError extends CustomError {
    /**
     * Create a new NotFoundError
     * @param {string} resource - Resource type
     * @param {string|number} identifier - Resource identifier
     */
    constructor(resource, identifier) {
        super(
            'NOT_FOUND_ERROR',
            `${resource} with identifier ${identifier} not found`,
            404
        );
        this.resource = resource;
        this.identifier = identifier;
    }
}

/**
 * Service Error class
 * @extends CustomError
 */
class ServiceError extends CustomError {
    /**
     * Create a new ServiceError
     * @param {string} service - Service name
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     */
    constructor(service, message, statusCode = 500) {
        super('SERVICE_ERROR', `Service ${service}: ${message}`, statusCode);
        this.service = service;
    }
}

/**
 * Database Error class
 * @extends CustomError
 */
class DatabaseError extends CustomError {
    /**
     * Create a new DatabaseError
     * @param {string} message - Error message
     * @param {Error} originalError - Original database error
     */
    constructor(message, originalError = null) {
        super('DATABASE_ERROR', message, 500);
        this.originalError = originalError;
    }
}

/**
 * Format error response
 * @param {Error} err - Error object
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(err) {
    if (err instanceof CustomError) {
        const response = {
            status: 'error',
            code: err.code,
            message: err.message
        };

        // Add validation errors if available
        if (err instanceof ValidationError && err.errors) {
            response.errors = err.errors;
        }

        return response;
    }

    // Default error response for unknown errors
    return {
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
    };
}

/**
 * Error handler middleware for Express
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
    // Log error
    console.error('Error:', err);

    // Handle CustomError instances
    if (err instanceof CustomError) {
        return res.status(err.statusCode).json(formatErrorResponse(err));
    }

    // Handle other errors
    res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
    });
}

module.exports = {
    CustomError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ServiceError,
    DatabaseError,
    formatErrorResponse,
    errorHandler
}; 