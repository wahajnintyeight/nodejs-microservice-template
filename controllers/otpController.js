/**
 * OTP Controller
 * Handles OTP generation and verification
 */

// In-memory OTP storage (replace with database in production)
const otpStore = new Map();

// OTP configuration
const config = {
    length: 6,
    expiryMinutes: 10,
    type: 'numeric' // numeric, alphanumeric
};

/**
 * Generate a new OTP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateOTP = (req, res) => {
    try {
        const { identifier } = req.body;

        if (!identifier) {
            return res.api.badRequest('Missing identifier');
        }

        // Generate OTP
        let otp;
        if (config.type === 'numeric') {
            otp = Math.floor(Math.pow(10, config.length - 1) + Math.random() * 9 * Math.pow(10, config.length - 1)).toString();
        } else {
            // Alphanumeric
            const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            otp = Array(config.length).fill().map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        }

        // Store OTP with expiry time
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + config.expiryMinutes);

        otpStore.set(identifier, {
            otp,
            expiryTime,
            attempts: 0
        });

        console.log(`Generated OTP for ${identifier}: ${otp} (expires: ${expiryTime})`);

        return res.api.success({
            expiryMinutes: config.expiryMinutes
        }, 'OTP generated successfully');
    } catch (error) {
        console.error('Error generating OTP:', error);
        return res.api.internalError('Failed to generate OTP');
    }
};

/**
 * Verify an OTP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyOTP = (req, res) => {
    try {
        const { identifier, otp } = req.body;

        if (!identifier || !otp) {
            return res.api.badRequest('Missing identifier or OTP');
        }

        const otpData = otpStore.get(identifier);

        // Check if OTP exists
        if (!otpData) {
            console.log(`No OTP found for ${identifier}`);
            return res.api.badRequest('Invalid or expired OTP');
        }

        // Check if OTP is expired
        if (new Date() > otpData.expiryTime) {
            console.log(`OTP expired for ${identifier}`);
            otpStore.delete(identifier);
            return res.api.badRequest('OTP has expired');
        }

        // Increment attempts
        otpData.attempts += 1;

        // Check if OTP matches
        if (otpData.otp === otp) {
            console.log(`OTP verified successfully for ${identifier}`);
            otpStore.delete(identifier);
            return res.api.success(null, 'OTP verified successfully');
        }

        // Check max attempts (3)
        if (otpData.attempts >= 3) {
            console.log(`Max attempts reached for ${identifier}`);
            otpStore.delete(identifier);
            return res.api.badRequest('Maximum verification attempts reached');
        } else {
            otpStore.set(identifier, otpData);
        }

        console.log(`Invalid OTP for ${identifier}`);
        return res.api.badRequest('Invalid OTP', { attemptsLeft: 3 - otpData.attempts });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.api.internalError('Failed to verify OTP');
    }
};

module.exports = {
    generateOTP,
    verifyOTP
}; 