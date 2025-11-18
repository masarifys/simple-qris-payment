# 💳 Simple QRIS Payment

Production-ready QRIS payment system using Duitku payment gateway. Fully configured for deployment on Ubuntu 24.04 with Node.js 24 LTS.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/masarifys/simple-qris-payment)

## 🌟 Features

### Core Features
- ✅ **Simple Payment Form** - Name, email, amount, description
- ✅ **QRIS Integration** - Auto-generate QR code with Duitku
- ✅ **Real-time Status** - Automatic payment status checking
- ✅ **Mobile Responsive** - Works perfectly on all devices
- ✅ **Secure Callbacks** - Signature verification for webhooks

### Security Features
- 🔒 **Input Validation** - Express-validator for sanitization
- 🔒 **Rate Limiting** - Prevent abuse with express-rate-limit
- 🔒 **Security Headers** - Helmet.js for security headers
- 🔒 **CSRF Protection** - Built-in protection mechanisms
- 🔒 **Environment Variables** - Secure credential management

### Production Features
- 🚀 **PM2 Ready** - Process management with PM2
- 🚀 **Nginx Config** - Reverse proxy configuration included
- 🚀 **SSL/HTTPS** - Let's Encrypt configuration
- 🚀 **Auto Deployment** - Ubuntu setup script included
- 🚀 **Health Check** - Monitoring endpoint
- 🚀 **Log Management** - Structured logging with rotation

## 📋 Table of Contents

- [Quick Deploy](#-quick-deploy)
- [Ubuntu 24.04 Production Deployment](#-ubuntu-2404-production-deployment)
- [Local Development](#-local-development)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Duitku Setup](#-duitku-setup)
- [Monitoring & Maintenance](#-monitoring--maintenance)
- [Troubleshooting](#-troubleshooting)

## 🚀 Quick Deploy

### Heroku (One-Click Deploy)

1. Click the Deploy to Heroku button above
2. Set environment variables:
   - `DUITKU_MERCHANT_CODE` - Your merchant code from Duitku
   - `DUITKU_API_KEY` - Your API key from Duitku
3. Deploy and configure callback URLs in Duitku dashboard

## 🖥️ Ubuntu 24.04 Production Deployment

### Prerequisites

- Ubuntu 24.04 LTS server
- Root or sudo access
- Domain name (optional but recommended)
- Duitku merchant account

### Automatic Setup (Recommended)

Run the automated setup script:

```bash
# Clone repository
git clone https://github.com/masarifys/simple-qris-payment.git
cd simple-qris-payment

# Run setup script
sudo bash setup-ubuntu.sh
```

The script will:
- Install Node.js 24 LTS
- Install and configure PM2
- Setup Nginx reverse proxy
- Configure UFW firewall
- Setup SSL with Let's Encrypt (optional)
- Configure log rotation
- Start the application

### Manual Setup

If you prefer manual setup:

```bash
# 1. Install Node.js 24 LTS
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install PM2
sudo npm install -g pm2

# 3. Clone and setup application
git clone https://github.com/masarifys/simple-qris-payment.git
cd simple-qris-payment
npm install --production

# 4. Configure environment
cp .env.example .env
nano .env  # Edit with your credentials

# 5. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 6. Setup Nginx
sudo cp nginx.conf.example /etc/nginx/sites-available/qris-payment
sudo nano /etc/nginx/sites-available/qris-payment  # Edit domain name
sudo ln -s /etc/nginx/sites-available/qris-payment /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 7. Setup SSL (optional)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🏠 Local Development

### Requirements

- Node.js 24.x or higher
- npm 10.x or higher

### Setup

```bash
# Clone repository
git clone https://github.com/masarifys/simple-qris-payment.git
cd simple-qris-payment

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your Duitku credentials
nano .env

# Run development server
npm run dev

# Or run production mode locally
npm start
```

The application will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Duitku Configuration
DUITKU_MERCHANT_CODE=your_merchant_code
DUITKU_API_KEY=your_api_key
DUITKU_BASE_URL=https://sandbox.duitku.com/webapi/api

# Application
NODE_ENV=production
PORT=3000

# Optional: Custom URLs (auto-generated if not set)
DUITKU_CALLBACK_URL=https://yourdomain.com/callback
DUITKU_RETURN_URL=https://yourdomain.com/success
DUITKU_ERROR_URL=https://yourdomain.com/error
```

### Production vs Sandbox

**Sandbox (Testing):**
```env
DUITKU_BASE_URL=https://sandbox.duitku.com/webapi/api
```

**Production:**
```env
DUITKU_BASE_URL=https://passport.duitku.com/webapi/api
```

## 📋 API Documentation

### Endpoints

#### `POST /create-payment`

Create a new QRIS payment.

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "paymentAmount": 10000,
  "itemDetails": "Payment description (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merchantOrderId": "ORDER-xxx",
    "reference": "REF-xxx",
    "qrString": "data:image/png;base64,...",
    "amount": 10000,
    "customerName": "John Doe"
  }
}
```

#### `GET /payment-status/:orderId`

Check payment status.

**Response:**
```json
{
  "success": true,
  "data": {
    "statusCode": "00",
    "statusMessage": "SUCCESS"
  }
}
```

#### `POST /callback`

Webhook endpoint for Duitku callbacks (automatic).

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

## 🔒 Duitku Setup

1. **Register**: Sign up at [dashboard.duitku.com](https://dashboard.duitku.com)

2. **Get Credentials**:
   - Login to dashboard
   - Navigate to Settings > API
   - Copy Merchant Code and API Key

3. **Configure Callback URLs** in Duitku dashboard:
   - **Callback URL**: `https://yourdomain.com/callback`
   - **Return URL**: `https://yourdomain.com/success`
   - **Error URL**: `https://yourdomain.com/error`

4. **Test in Sandbox** first before going live

5. **Switch to Production**:
   - Update `DUITKU_BASE_URL` to production URL
   - Use production credentials

## 📱 Usage

### For Customers

1. Visit the payment page
2. Fill in:
   - Full name
   - Email address
   - Payment amount (Rp 1,000 - Rp 50,000,000)
   - Description (optional)
3. Click "Buat Pembayaran" (Create Payment)
4. Scan the QR code with your e-wallet app (GoPay, OVO, Dana, etc.)
5. Complete payment in your e-wallet
6. Payment status updates automatically
7. Redirected to success page when payment completes

## 📊 Monitoring & Maintenance

### PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs qris-payment

# Restart application
pm2 restart qris-payment

# Stop application
pm2 stop qris-payment

# Start application
pm2 start qris-payment

# Monitor resources
pm2 monit
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/qris-payment-error.log

# View access logs
sudo tail -f /var/log/nginx/qris-payment-access.log
```

### SSL Certificate Renewal

Certbot auto-renews certificates. To manually renew:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Log Files

- **Application logs**: `/var/www/qris-payment/logs/`
- **PM2 logs**: `~/.pm2/logs/`
- **Nginx logs**: `/var/log/nginx/`

## 🐛 Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs qris-payment --err

# Verify environment variables
cat .env

# Check if port is available
sudo netstat -tulpn | grep 3000
```

### Payment creation fails

1. Verify Duitku credentials in `.env`
2. Check API URL (sandbox vs production)
3. Verify callback URLs in Duitku dashboard
4. Check application logs: `pm2 logs qris-payment`

### Nginx 502 Bad Gateway

```bash
# Check if application is running
pm2 status

# Verify port in nginx config matches application
cat /etc/nginx/sites-available/qris-payment | grep proxy_pass

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues

```bash
# Test SSL
sudo certbot renew --dry-run

# Re-obtain certificate
sudo certbot --nginx -d yourdomain.com --force-renewal
```

## 🛠️ Tech Stack

### Backend
- **Node.js 24 LTS** - JavaScript runtime
- **Express.js** - Web framework
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation

### Frontend
- **Vanilla HTML/CSS/JavaScript** - No framework dependencies
- **Responsive Design** - Mobile-first approach
- **Modern CSS** - CSS Variables, Flexbox, Grid

### Infrastructure
- **PM2** - Process manager
- **Nginx** - Reverse proxy
- **Let's Encrypt** - SSL certificates
- **Ubuntu 24.04** - Operating system

### Payment Gateway
- **Duitku** - Indonesian payment gateway
- **QRIS** - QR Code Indonesian Standard

## 🔐 Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use strong API keys** from Duitku
3. **Keep dependencies updated**: `npm audit fix`
4. **Monitor logs regularly** for suspicious activity
5. **Use HTTPS in production** always
6. **Implement rate limiting** (already included)
7. **Validate all inputs** (already included)
8. **Use PM2 cluster mode** for better availability

## 📝 File Structure

```
simple-qris-payment/
├── public/              # Frontend files
│   ├── index.html      # Main payment form
│   ├── success.html    # Success page
│   ├── error.html      # Error page
│   ├── styles.css      # Styles
│   └── script.js       # Frontend logic
├── server.js           # Express server
├── ecosystem.config.js # PM2 configuration
├── nginx.conf.example  # Nginx template
├── setup-ubuntu.sh     # Ubuntu setup script
├── package.json        # Dependencies
├── .env.example        # Environment template
├── .gitignore         # Git ignore rules
├── Procfile           # Heroku process file
├── app.json           # Heroku app config
└── README.md          # This file
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - Feel free to use for your projects!

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/masarifys/simple-qris-payment/issues)
- **Duitku Support**: [Duitku Documentation](https://docs.duitku.com)

## 🎯 Roadmap

- [ ] Add transaction history
- [ ] Add admin dashboard
- [ ] Multiple payment methods
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Database integration
- [ ] API documentation (Swagger)
- [ ] Docker support
- [ ] Unit tests
- [ ] Integration tests

---

Made with ❤️ for Indonesian developers

💡 **Production Tip**: Always test in sandbox before deploying to production!
