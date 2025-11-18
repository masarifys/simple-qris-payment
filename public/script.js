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
    const emailInput = document.getElementById('customer
