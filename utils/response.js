const { StatusCodes } = require('http-status-codes');

class Response {
    constructor(res) {
        this.res = res;
    }

    send(data = null, message = 'Success', statusCode = StatusCodes.OK) {
        return this.res.status(statusCode).json({
            success: true,
            message,
            data
        });
    }

    success(data = null, message = 'Success') {
        return this.send(data, message, StatusCodes.OK);
    }

    created(data = null, message = 'Created successfully') {
        return this.send(data, message, StatusCodes.CREATED);
    }

    updated(data = null, message = 'Updated successfully') {
        return this.send(data, message, StatusCodes.OK);
    }

    deleted(message = 'Deleted successfully') {
        return this.send(null, message, StatusCodes.OK);
    }

    noContent() {
        return this.res.status(StatusCodes.NO_CONTENT).end();
    }

    badRequest(message = 'Bad request', errors = null) {
        return this.error(message, StatusCodes.BAD_REQUEST, errors);
    }

    unauthorized(message = 'Unauthorized', errors = null) {
        return this.error(message, StatusCodes.UNAUTHORIZED, errors);
    }

    forbidden(message = 'Forbidden', errors = null) {
        return this.error(message, StatusCodes.FORBIDDEN, errors);
    }

    notFound(message = 'Resource not found', errors = null) {
        return this.error(message, StatusCodes.NOT_FOUND, errors);
    }

    conflict(message = 'Conflict', errors = null) {
        return this.error(message, StatusCodes.CONFLICT, errors);
    }

    tooMany(message = 'Too many requests', errors = null) {
        return this.error(message, StatusCodes.TOO_MANY_REQUESTS, errors);
    }

    internalError(message = 'Internal server error', errors = null) {
        return this.error(message, StatusCodes.INTERNAL_SERVER_ERROR, errors);
    }

    error(message = 'Error', statusCode = StatusCodes.INTERNAL_SERVER_ERROR, errors = null) {
        const response = {
            success: false,
            message
        };

        if (errors) {
            response.errors = errors;
        }

        return this.res.status(statusCode).json(response);
    }

    stream(data, type = 'application/octet-stream') {
        return this.res.set('Content-Type', type).send(data);
    }

    file(path, filename = null) {
        if (filename) {
            return this.res.download(path, filename);
        }
        return this.res.sendFile(path);
    }

    redirect(url, statusCode = StatusCodes.FOUND) {
        return this.res.redirect(statusCode, url);
    }

    custom(statusCode, data) {
        return this.res.status(statusCode).json(data);
    }
}

module.exports = Response;
