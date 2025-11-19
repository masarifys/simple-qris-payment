const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Heroku deployment - Required for proper rate limiting with X-Forwarded-For
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.',
    standardHeaders: true,
    legacyHeaders: false,
});

const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit payment creation to 5 per minute per IP
    message: 'Terlalu banyak permintaan pembayaran, silakan tunggu sebentar.',
    skipSuccessfulRequests: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Health check endpoint for Heroku and monitoring
app.get('/health', (req, res) => {
    const appUrl = req.get('host');
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        app_url: `https://${appUrl}`,
        endpoints: {
            callback_url: `https://${appUrl}/callback`,
            return_url: `https://${appUrl}/success`,
            error_url: `https://${appUrl}/error`
        }
    });
});

// Auto-generate URLs based on Heroku app URL
function getAppUrls(req) {
    const baseUrl = `https://${req.get('host')}`;
    return {
        callbackUrl: process.env.DUITKU_CALLBACK_URL || `${baseUrl}/callback`,
        returnUrl: process.env.DUITKU_RETURN_URL || `${baseUrl}/success`,
        errorUrl: process.env.DUITKU_ERROR_URL || `${baseUrl}/error`
    };
}

// Duitku Configuration with auto-detection
const DUITKU_CONFIG = {
    merchantCode: process.env.DUITKU_MERCHANT_CODE,
    apiKey: process.env.DUITKU_API_KEY,
    baseUrl: process.env.DUITKU_BASE_URL || 'https://sandbox.duitku.com/webapi/api'
};

// Validate environment variables
const requiredEnvVars = ['DUITKU_MERCHANT_CODE', 'DUITKU_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars);
    console.log('🔧 Please set the following environment variables:');
    missingEnvVars.forEach(envVar => {
        console.log(`   - ${envVar}`);
    });
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// Validate credentials format
if (DUITKU_CONFIG.merchantCode && DUITKU_CONFIG.merchantCode.length < 5) {
    console.warn('⚠️  DUITKU_MERCHANT_CODE seems too short, please verify your credentials');
}
if (DUITKU_CONFIG.apiKey && DUITKU_CONFIG.apiKey.length < 10) {
    console.warn('⚠️  DUITKU_API_KEY seems too short, please verify your credentials');
}

// Log API endpoint configuration
const isProduction = DUITKU_CONFIG.baseUrl.startsWith('https://passport.duitku.com');
const isSandbox = DUITKU_CONFIG.baseUrl.startsWith('https://sandbox.duitku.com');
if (isProduction) {
    console.log('🔴 Using PRODUCTION Duitku API endpoint');
} else if (isSandbox) {
    console.log('🟡 Using SANDBOX Duitku API endpoint');
} else {
    console.warn('⚠️  Custom Duitku API endpoint:', DUITKU_CONFIG.baseUrl);
}

// Generate signature for Duitku
function generateSignature(merchantCode, paymentAmount, paymentMethod, merchantOrderId, apiKey) {
    const signatureString = merchantCode + paymentAmount + paymentMethod + merchantOrderId + apiKey;
    return crypto.createHash('md5').update(signatureString).digest('hex');
}

// Verify callback signature
function verifyCallbackSignature(merchantCode, amount, merchantOrderId, apiKey) {
    const signatureString = merchantCode + amount + merchantOrderId + apiKey;
    return crypto.createHash('md5').update(signatureString).digest('hex');
}

// Input validation rules
const paymentValidationRules = [
    body('customerName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Nama harus diisi minimal 2 karakter dan maksimal 50 karakter')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Nama hanya boleh berisi huruf dan spasi')
        .escape(),
    body('customerEmail')
        .trim()
        .isEmail()
        .withMessage('Format email tidak valid')
        .normalizeEmail(),
    body('paymentAmount')
        .isInt({ min: 1000, max: 50000000 })
        .withMessage('Jumlah pembayaran harus antara Rp 1.000 dan Rp 50.000.000')
        .toInt(),
    body('itemDetails')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Deskripsi maksimal 200 karakter')
        .escape()
];

// Validation error handler
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: errors.array()[0].msg,
            errors: errors.array()
        });
    }
    next();
}

// Error handler middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.get('/error', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'error.html'));
});

// Create payment endpoint
app.post('/create-payment', paymentLimiter, paymentValidationRules, handleValidationErrors, async (req, res) => {
    try {
        const { customerName, customerEmail, paymentAmount, itemDetails } = req.body;
        const urls = getAppUrls(req);

        // Validate environment
        if (!DUITKU_CONFIG.merchantCode || !DUITKU_CONFIG.apiKey) {
            return res.status(500).json({
                success: false,
                message: 'Konfigurasi payment gateway belum lengkap. Hubungi administrator.'
            });
        }

        const merchantOrderId = 'ORDER-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const paymentMethod = 'SP'; // QRIS payment method in Duitku
        
        // Generate signature
        const signature = generateSignature(
            DUITKU_CONFIG.merchantCode,
            paymentAmount,
            paymentMethod,
            merchantOrderId,
            DUITKU_CONFIG.apiKey
        );

        // Prepare payment data
        const paymentData = {
            merchantCode: DUITKU_CONFIG.merchantCode,
            paymentAmount: parseInt(paymentAmount),
            paymentMethod: paymentMethod,
            merchantOrderId: merchantOrderId,
            productDetails: itemDetails || `Pembayaran oleh ${customerName}`,
            customerVaName: customerName.trim(),
            email: customerEmail.trim(),
            callbackUrl: urls.callbackUrl,
            returnUrl: urls.returnUrl,
            signature: signature,
            expiryPeriod: 60 // 60 minutes
        };

        console.log('🚀 Creating payment:', {
            orderId: merchantOrderId,
            amount: paymentAmount,
            customer: customerName,
            email: customerEmail,
            apiEndpoint: DUITKU_CONFIG.baseUrl
        });

        // Send request to Duitku
        const apiUrl = `${DUITKU_CONFIG.baseUrl}/merchant/createinvoice`;
        console.log('📡 Sending request to:', apiUrl);
        
        const response = await axios.post(
            apiUrl,
            paymentData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Simple-QRIS-Payment/1.0'
                },
                timeout: 30000 // 30 seconds timeout
            }
        );

        console.log('✅ Duitku response received:', {
            statusCode: response.data.statusCode,
            statusMessage: response.data.statusMessage,
            hasQrString: !!response.data.qrString,
            hasPaymentUrl: !!response.data.paymentUrl
        });

        if (response.data.statusCode === '00') {
            res.json({
                success: true,
                data: {
                    merchantOrderId: merchantOrderId,
                    reference: response.data.reference,
                    paymentUrl: response.data.paymentUrl,
                    qrString: response.data.qrString,
                    amount: paymentAmount,
                    customerName: customerName,
                    vaNumber: response.data.vaNumber
                }
            });
        } else {
            throw new Error(response.data.statusMessage || 'Payment creation failed');
        }

    } catch (error) {
        // Detailed error logging for debugging
        const errorDetails = {
            message: error.message,
            code: error.code,
            httpStatus: error.response?.status,
            httpStatusText: error.response?.statusText,
            duitkuResponse: error.response?.data,
            duitkuStatusCode: error.response?.data?.statusCode,
            duitkuStatusMessage: error.response?.data?.statusMessage,
            requestUrl: error.config?.url,
            requestMethod: error.config?.method,
            timeout: error.code === 'ECONNABORTED'
        };
        
        console.error('❌ Payment creation error:', errorDetails);
        
        // Enhanced error messages based on error type
        let userMessage = 'Gagal membuat pembayaran. Silakan coba lagi.';
        let debugInfo = error.message;
        
        if (error.code === 'ECONNABORTED') {
            userMessage = 'Request timeout. Payment gateway tidak merespons dalam waktu yang ditentukan.';
            debugInfo = 'Connection timeout - Check network or API endpoint availability';
        } else if (error.response?.status === 500) {
            userMessage = 'Payment gateway mengalami kesalahan internal. Silakan coba beberapa saat lagi.';
            debugInfo = `HTTP 500: ${error.response?.data?.statusMessage || 'Internal Server Error'} - Check API credentials and endpoint configuration`;
        } else if (error.response?.status === 401 || error.response?.status === 403) {
            userMessage = 'Kesalahan autentikasi. Silakan hubungi administrator.';
            debugInfo = 'Authentication failed - Check DUITKU_MERCHANT_CODE and DUITKU_API_KEY';
        } else if (error.response?.status === 400) {
            userMessage = error.response?.data?.statusMessage || 'Data pembayaran tidak valid.';
            debugInfo = `Bad Request: ${JSON.stringify(error.response?.data)}`;
        } else if (error.response?.data?.statusMessage) {
            userMessage = error.response.data.statusMessage;
            debugInfo = userMessage;
        }
        
        console.error('💡 Debug info:', debugInfo);
        
        res.status(500).json({
            success: false,
            message: userMessage,
            error: process.env.NODE_ENV === 'development' ? debugInfo : 'Payment gateway error'
        });
    }
});

// Callback handler from Duitku
app.post('/callback', express.raw({type: 'application/x-www-form-urlencoded'}), (req, res) => {
    try {
        // Parse the raw body
        const body = new URLSearchParams(req.body.toString());
        const callbackData = {};
        for (const [key, value] of body.entries()) {
            callbackData[key] = value;
        }

        const {
            merchantCode,
            amount,
            merchantOrderId,
            productDetail,
            additionalParam,
            paymentCode,
            resultCode,
            merchantUserId,
            reference,
            signature
        } = callbackData;

        console.log('📞 Received callback:', {
            merchantOrderId,
            amount,
            resultCode,
            timestamp: new Date().toISOString()
        });

        // Verify signature
        const calculatedSignature = verifyCallbackSignature(
            merchantCode,
            amount,
            merchantOrderId,
            DUITKU_CONFIG.apiKey
        );

        if (signature !== calculatedSignature) {
            console.error('❌ Invalid signature in callback');
            return res.status(400).send('Invalid signature');
        }

        // Process payment status
        if (resultCode === '00') {
            console.log(`✅ Payment successful for order: ${merchantOrderId}`);
            // Here you can update your database or perform other actions
            // Example: await updateOrderStatus(merchantOrderId, 'paid');
        } else {
            console.log(`❌ Payment failed for order: ${merchantOrderId}, code: ${resultCode}`);
            // Example: await updateOrderStatus(merchantOrderId, 'failed');
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Callback processing error:', error);
        res.status(500).send('Internal server error');
    }
});

// Check payment status
app.get('/payment-status/:merchantOrderId', async (req, res) => {
    try {
        const { merchantOrderId } = req.params;
        
        if (!DUITKU_CONFIG.merchantCode || !DUITKU_CONFIG.apiKey) {
            return res.status(500).json({
                success: false,
                message: 'Konfigurasi payment gateway belum lengkap'
            });
        }
        
        const signature = crypto.createHash('md5')
            .update(DUITKU_CONFIG.merchantCode + merchantOrderId + DUITKU_CONFIG.apiKey)
            .digest('hex');

        const response = await axios.post(
            `${DUITKU_CONFIG.baseUrl}/merchant/transactionStatus`,
            {
                merchantCode: DUITKU_CONFIG.merchantCode,
                merchantOrderId: merchantOrderId,
                signature: signature
            },
            {
                timeout: 30000
            }
        );

        console.log('📊 Status check:', {
            orderId: merchantOrderId,
            status: response.data.statusCode
        });

        res.json({
            success: true,
            data: response.data
        });

    } catch (error) {
        const errorDetails = {
            message: error.message,
            code: error.code,
            httpStatus: error.response?.status,
            duitkuResponse: error.response?.data,
            timeout: error.code === 'ECONNABORTED'
        };
        
        console.error('❌ Status check error:', errorDetails);
        
        let userMessage = 'Gagal mengecek status pembayaran';
        let debugInfo = error.message;
        
        if (error.code === 'ECONNABORTED') {
            userMessage = 'Request timeout saat mengecek status pembayaran.';
            debugInfo = 'Connection timeout - Check network or API endpoint';
        } else if (error.response?.status === 500) {
            debugInfo = `HTTP 500: ${error.response?.data?.statusMessage || 'Internal Server Error'}`;
        } else if (error.response?.data?.statusMessage) {
            userMessage = error.response.data.statusMessage;
            debugInfo = userMessage;
        }
        
        console.error('💡 Debug info:', debugInfo);
        
        res.status(500).json({
            success: false,
            message: userMessage,
            error: process.env.NODE_ENV === 'development' ? debugInfo : 'Status check failed'
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Trust Proxy: enabled (Heroku compatible)`);
    console.log(`💳 Duitku API: ${DUITKU_CONFIG.baseUrl}`);
    console.log(`📋 Merchant Code: ${DUITKU_CONFIG.merchantCode ? '✓ Set' : '✗ Missing'}`);
    console.log(`🔑 API Key: ${DUITKU_CONFIG.apiKey ? '✓ Set' : '✗ Missing'}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
    
    if (missingEnvVars.length > 0) {
        console.log(`⚠️  Missing env vars: ${missingEnvVars.join(', ')}`);
    }
});
