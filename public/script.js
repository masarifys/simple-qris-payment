// ===== GLOBAL VARIABLES =====
let currentOrderId = null;
let statusCheckInterval = null;
let paymentTimeout = null;

// ===== DOM ELEMENTS =====
const paymentForm = document.getElementById('paymentForm');
const paymentResult = document.getElementById('paymentResult');
const payButton = document.getElementById('payButton');
const btnText = document.querySelector('.btn-text');
const loadingSpinner = document.querySelector('.loading-spinner');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupFormValidation();
});

function initializeApp() {
    // Check if there's any payment in progress from localStorage
    const savedPayment = localStorage.getItem('currentPayment');
    if (savedPayment) {
        try {
            const paymentData = JSON.parse(savedPayment);
            // Check if payment is still valid (not expired)
            if (Date.now() - paymentData.timestamp < 15 * 60 * 1000) {
                showPaymentResult(paymentData);
                showToast('Melanjutkan pembayaran yang sedang berlangsung...', 'info');
            } else {
                localStorage.removeItem('currentPayment');
            }
        } catch (error) {
            localStorage.removeItem('currentPayment');
        }
    }

    // Format number inputs
    setupNumberFormatting();
    
    // Setup real-time validation
    setupRealTimeValidation();
}

function setupEventListeners() {
    // Form submission
    paymentForm.addEventListener('submit', handlePaymentSubmit);
    
    // Input formatting
    document.getElementById('customerName').addEventListener('input', formatNameInput);
    document.getElementById('paymentAmount').addEventListener('input', formatAmountInput);
    
    // Prevent form submission on Enter for specific inputs
    document.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && this.type !== 'submit') {
                e.preventDefault();
            }
        });
    });
}

function setupFormValidation() {
    const inputs = document.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', validateInput);
        input.addEventListener('input', clearValidationState);
    });
}

function setupNumberFormatting() {
    const amountInput = document.getElementById('paymentAmount');
    amountInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value) {
            // Add thousand separators for display
            const formatted = parseInt(value).toLocaleString('id-ID');
            // Update display value
            e.target.dataset.display = formatted;
        }
    });
}

function setupRealTimeValidation() {
    const emailInput = document.getElementById('customerEmail');
    const nameInput = document.getElementById('customerName');
    const amountInput = document.getElementById('paymentAmount');
    
    emailInput.addEventListener('blur', function() {
        if (this.value && !isValidEmail(this.value)) {
            this.setCustomValidity('Format email tidak valid');
        } else {
            this.setCustomValidity('');
        }
    });
    
    amountInput.addEventListener('blur', function() {
        const amount = parseInt(this.value);
        if (amount && (amount < 1000 || amount > 50000000)) {
            this.setCustomValidity('Jumlah harus antara Rp 1.000 - Rp 50.000.000');
        } else {
            this.setCustomValidity('');
        }
    });
}

// ===== INPUT FORMATTING =====
function formatNameInput(e) {
    // Capitalize first letter of each word
    let value = e.target.value;
    value = value.replace(/\b\w/g, char => char.toUpperCase());
    e.target.value = value;
}

function formatAmountInput(e) {
    // Remove non-numeric characters
    let value = e.target.value.replace(/\D/g, '');
    e.target.value = value;
}

// ===== VALIDATION =====
function validateInput(e) {
    const input = e.target;
    if (input.checkValidity()) {
        input.classList.remove('invalid');
        input.classList.add('valid');
    } else {
        input.classList.remove('valid');
        input.classList.add('invalid');
    }
}

function clearValidationState(e) {
    e.target.classList.remove('valid', 'invalid');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===== FORM SUBMISSION =====
async function handlePaymentSubmit(e) {
    e.preventDefault();
    
    // Disable submit button
    payButton.disabled = true;
    btnText.style.display = 'none';
    loadingSpinner.style.display = 'block';
    
    try {
        const formData = {
            customerName: document.getElementById('customerName').value.trim(),
            customerEmail: document.getElementById('customerEmail').value.trim(),
            paymentAmount: document.getElementById('paymentAmount').value,
            itemDetails: document.getElementById('itemDetails').value.trim() || undefined
        };
        
        // Validate form data
        if (!formData.customerName || formData.customerName.length < 2) {
            throw new Error('Nama harus diisi minimal 2 karakter');
        }
        
        if (!isValidEmail(formData.customerEmail)) {
            throw new Error('Format email tidak valid');
        }
        
        const amount = parseInt(formData.paymentAmount);
        if (amount < 1000 || amount > 50000000) {
            throw new Error('Jumlah harus antara Rp 1.000 - Rp 50.000.000');
        }
        
        // Send request to create payment
        const response = await fetch('/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Gagal membuat pembayaran');
        }
        
        // Save payment data to localStorage
        const paymentData = {
            ...result.data,
            timestamp: Date.now()
        };
        localStorage.setItem('currentPayment', JSON.stringify(paymentData));
        
        // Show payment result
        showPaymentResult(paymentData);
        showToast('Pembayaran berhasil dibuat! Silakan scan QR code', 'success');
        
        // Start checking payment status
        startStatusChecking(paymentData.merchantOrderId);
        
    } catch (error) {
        console.error('Payment error:', error);
        showToast(error.message || 'Terjadi kesalahan saat membuat pembayaran', 'error');
        
        // Re-enable button
        payButton.disabled = false;
        btnText.style.display = 'flex';
        loadingSpinner.style.display = 'none';
    }
}

// ===== PAYMENT DISPLAY =====
function showPaymentResult(paymentData) {
    // Hide form
    paymentForm.style.display = 'none';
    
    // Show result
    paymentResult.style.display = 'block';
    
    // Display QR code
    const qrCodeContainer = document.getElementById('qrCode');
    if (paymentData.qrString) {
        qrCodeContainer.innerHTML = `<img src="${paymentData.qrString}" alt="QR Code" style="max-width: 100%; height: auto;">`;
    } else {
        qrCodeContainer.innerHTML = '<p>QR Code tidak tersedia</p>';
    }
    
    // Display payment info
    document.getElementById('orderId').textContent = paymentData.merchantOrderId;
    document.getElementById('paymentAmountDisplay').textContent = 'Rp ' + parseInt(paymentData.amount).toLocaleString('id-ID');
    document.getElementById('customerNameDisplay').textContent = paymentData.customerName;
    
    // Store current order ID
    currentOrderId = paymentData.merchantOrderId;
}

// ===== STATUS CHECKING =====
function startStatusChecking(orderId) {
    // Clear any existing interval
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    // Check status every 5 seconds
    statusCheckInterval = setInterval(() => {
        checkPaymentStatus(orderId);
    }, 5000);
    
    // Set timeout after 15 minutes
    paymentTimeout = setTimeout(() => {
        clearInterval(statusCheckInterval);
        showToast('Waktu pembayaran telah habis. Silakan buat pembayaran baru.', 'warning');
        updateStatusIndicator('expired');
    }, 15 * 60 * 1000);
}

async function checkPaymentStatus(orderId = currentOrderId) {
    if (!orderId) {
        console.error('No order ID provided');
        return;
    }
    
    try {
        const response = await fetch(`/payment-status/${orderId}`);
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            console.error('Status check failed:', result.message);
            return;
        }
        
        const status = result.data;
        
        // Check payment status
        if (status.statusCode === '00') {
            // Payment successful
            clearInterval(statusCheckInterval);
            clearTimeout(paymentTimeout);
            updateStatusIndicator('success');
            showToast('Pembayaran berhasil! Terima kasih.', 'success');
            localStorage.removeItem('currentPayment');
            
            // Redirect to success page after 2 seconds
            setTimeout(() => {
                window.location.href = '/success';
            }, 2000);
        } else if (status.statusCode === '01') {
            // Payment pending
            updateStatusIndicator('waiting');
        } else {
            // Payment failed
            clearInterval(statusCheckInterval);
            clearTimeout(paymentTimeout);
            updateStatusIndicator('failed');
            showToast('Pembayaran gagal atau dibatalkan', 'error');
            localStorage.removeItem('currentPayment');
        }
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

function updateStatusIndicator(status) {
    const statusElement = document.querySelector('.status-indicator');
    const statusText = statusElement.querySelector('span');
    
    // Remove all status classes
    statusElement.classList.remove('waiting', 'success', 'failed');
    
    switch (status) {
        case 'waiting':
            statusElement.classList.add('waiting');
            statusText.textContent = 'Menunggu pembayaran...';
            break;
        case 'success':
            statusElement.classList.add('success');
            statusText.textContent = '✅ Pembayaran berhasil!';
            break;
        case 'failed':
            statusElement.classList.add('failed');
            statusText.textContent = '❌ Pembayaran gagal';
            break;
        case 'expired':
            statusElement.classList.add('failed');
            statusText.textContent = '⏰ Waktu pembayaran habis';
            break;
    }
}

// ===== RESET FORM =====
function resetForm() {
    // Clear intervals and timeouts
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    if (paymentTimeout) {
        clearTimeout(paymentTimeout);
    }
    
    // Clear localStorage
    localStorage.removeItem('currentPayment');
    currentOrderId = null;
    
    // Hide result, show form
    paymentResult.style.display = 'none';
    paymentForm.style.display = 'flex';
    
    // Reset form
    paymentForm.reset();
    
    // Re-enable button
    payButton.disabled = false;
    btnText.style.display = 'flex';
    loadingSpinner.style.display = 'none';
    
    showToast('Form telah direset', 'info');
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount) {
    return 'Rp ' + parseInt(amount).toLocaleString('id-ID');
}

// ===== CLEANUP ON PAGE UNLOAD =====
window.addEventListener('beforeunload', function() {
    // Don't clear localStorage on unload to allow continuing payment
    // localStorage.removeItem('currentPayment');
});

