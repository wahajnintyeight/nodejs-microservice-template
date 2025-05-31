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
