/**
 * Hello Controller
 * Handles hello route requests
 */

/**
 * Get hello message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getHello = (req, res) => {
    try {
        return res.api.success({
            timestamp: new Date().toISOString()
        }, 'Hello from API Service!');
    } catch (error) {
        console.error('Error in hello controller:', error);
        return res.api.internalError();
    }
};

/**
 * Get hello with name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getHelloWithName = (req, res) => {
    try {
        const { name } = req.params;

        return res.api.success({
            timestamp: new Date().toISOString()
        }, `Hello, ${name}! Welcome to our API Service.`);
    } catch (error) {
        console.error('Error in hello controller:', error);
        return res.api.internalError();
    }
};

module.exports = {
    getHello,
    getHelloWithName
}; 