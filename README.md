# 💳 Simple QRIS Payment

Sistem pembayaran QRIS sederhana menggunakan Duitku payment gateway. Siap deploy ke Heroku dengan satu klik!

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/masarifys/simple-qris-payment)

## 🌟 Features

- ✅ **Form pembayaran sederhana** - Nama, email, jumlah
- ✅ **QRIS integration** - Generate QR code otomatis
- ✅ **Real-time status** - Cek status pembayaran otomatis
- ✅ **Mobile friendly** - Responsive design
- ✅ **One-click deploy** - Siap deploy ke Heroku
- ✅ **Secure** - Input validation & error handling
- ✅ **Production ready** - Logging & monitoring

## 🚀 Quick Deploy

Klik tombol di atas untuk deploy ke Heroku dalam 1 menit!

Setelah deploy, set environment variables:
- `DUITKU_MERCHANT_CODE` - Dari dashboard Duitku
- `DUITKU_API_KEY` - Dari dashboard Duitku

## 🏠 Local Development

```bash
# Clone repository
git clone https://github.com/masarifys/simple-qris-payment.git
cd simple-qris-payment

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env dengan credentials Duitku Anda
nano .env

# Run development server
npm run dev
```

## 🔧 Environment Variables

```env
DUITKU_MERCHANT_CODE=your_merchant_code
DUITKU_API_KEY=your_api_key
DUITKU_BASE_URL=https://sandbox.duitku.com/webapi/api
```

## 📱 Usage

1. **Isi form pembayaran** - Nama, email, jumlah
2. **Klik "Buat Pembayaran"** 
3. **Scan QR Code** dengan aplikasi e-wallet
4. **Status otomatis update** setelah pembayaran berhasil

## 🔒 Duitku Setup

1. Daftar di [dashboard.duitku.com](https://dashboard.duitku.com)
2. Dapatkan Merchant Code & API Key
3. Set callback URL ke: `https://yourapp.herokuapp.com/callback`
4. Set return URL ke: `https://yourapp.herokuapp.com/success`
5. Set error URL ke: `https://yourapp.herokuapp.com/error`

## 📋 API Endpoints

- `POST /create-payment` - Buat pembayaran baru
- `POST /callback` - Webhook dari Duitku
- `GET /payment-status/:orderId` - Cek status pembayaran
- `GET /health` - Health check

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JS
- **Payment**: Duitku Gateway
- **Deploy**: Heroku ready

## 📄 License

MIT License - Feel free to use for your projects!

---

💡 **Tip**: Untuk production, ganti `DUITKU_BASE_URL` ke `https://passport.duitku.com/webapi/api`
