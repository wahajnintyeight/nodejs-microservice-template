const Response = require('../utils/response');

const responseHandler = (req, res, next) => {
    res.api = new Response(res);
    next();
};

module.exports = responseHandler; 