const express = require('express');
const otpController = require('../controllers/otpController');

const router = express.Router();

router.post('/generate', otpController.generateOTP);
router.post('/verify', otpController.verifyOTP);

module.exports = router;