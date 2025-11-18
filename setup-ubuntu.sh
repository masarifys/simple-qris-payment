#!/bin/bash

# Ubuntu 24.04 LTS Setup Script for QRIS Payment System
# This script automates the deployment of the QRIS payment system on Ubuntu 24.04

set -e

echo "=========================================="
echo "QRIS Payment System - Ubuntu 24.04 Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw

# Install Node.js 24 LTS
echo "📦 Installing Node.js 24 LTS..."
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version:"
node --version
echo "✅ npm version:"
npm --version

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Create application directory
echo "📁 Setting up application directory..."
APP_DIR="/var/www/qris-payment"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository (update with your repo URL)
echo "📥 Cloning repository..."
if [ ! -d ".git" ]; then
    git clone https://github.com/masarifys/simple-qris-payment.git .
else
    echo "Repository already exists, pulling latest changes..."
    git pull
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

# Setup environment file
echo "⚙️  Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "❗ Please edit .env file with your Duitku credentials:"
    echo "   nano $APP_DIR/.env"
    echo ""
    read -p "Press Enter to continue after editing .env file..."
fi

# Setup PM2
echo "🚀 Setting up PM2..."
pm2 delete qris-payment 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER

# Setup Nginx
echo "🌐 Setting up Nginx..."
cp nginx.conf.example /etc/nginx/sites-available/qris-payment

# Prompt for domain
read -p "Enter your domain name (e.g., example.com): " DOMAIN
if [ ! -z "$DOMAIN" ]; then
    sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/qris-payment
    
    # Create symlink
    ln -sf /etc/nginx/sites-available/qris-payment /etc/nginx/sites-enabled/
    
    # Remove default site if exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    nginx -t
    
    # Reload nginx
    systemctl reload nginx
    systemctl enable nginx
    
    echo "✅ Nginx configured for domain: $DOMAIN"
fi

# Setup UFW Firewall
echo "🔒 Setting up firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
ufw status

# Setup SSL with Let's Encrypt
if [ ! -z "$DOMAIN" ]; then
    echo "🔐 Setting up SSL certificate..."
    read -p "Do you want to setup SSL with Let's Encrypt? (y/n): " SETUP_SSL
    if [ "$SETUP_SSL" = "y" ] || [ "$SETUP_SSL" = "Y" ]; then
        read -p "Enter your email for SSL certificate: " EMAIL
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL
        
        # Auto-renewal
        systemctl enable certbot.timer
        echo "✅ SSL certificate installed and auto-renewal enabled"
    fi
fi

# Setup log rotation
echo "📋 Setting up log rotation..."
cat > /etc/logrotate.d/qris-payment << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Set correct permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

echo ""
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "📝 Next steps:"
echo "1. Edit environment file: nano $APP_DIR/.env"
echo "2. Configure Duitku dashboard callback URLs:"
echo "   - Callback URL: https://$DOMAIN/callback"
echo "   - Return URL: https://$DOMAIN/success"
echo "   - Error URL: https://$DOMAIN/error"
echo "3. Restart application: pm2 restart qris-payment"
echo "4. Check status: pm2 status"
echo "5. View logs: pm2 logs qris-payment"
echo ""
echo "🌐 Your application should be running at:"
if [ ! -z "$DOMAIN" ]; then
    echo "   https://$DOMAIN"
else
    echo "   http://$(hostname -I | awk '{print $1}'):3000"
fi
echo ""
echo "📊 Useful commands:"
echo "   pm2 status              - Check application status"
echo "   pm2 logs qris-payment   - View application logs"
echo "   pm2 restart qris-payment - Restart application"
echo "   pm2 stop qris-payment    - Stop application"
echo "   nginx -t                - Test nginx configuration"
echo "   systemctl status nginx  - Check nginx status"
echo ""
