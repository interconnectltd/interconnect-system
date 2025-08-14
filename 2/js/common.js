// Common JavaScript utilities
const INTERCONNECT = {
    // API Configuration
    apiUrl: window.SUPABASE_URL || '',
    apiKey: window.SUPABASE_ANON_KEY || '',
    
    // Utility Functions
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY'
        }).format(amount);
    },
    
    formatDate: (date) => {
        return new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    },
    
    showNotification: (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    // Loading State
    showLoading: (element) => {
        if (element) {
            element.classList.add('loading');
            element.disabled = true;
        }
    },
    
    hideLoading: (element) => {
        if (element) {
            element.classList.remove('loading');
            element.disabled = false;
        }
    },
    
    // Error Handling
    handleError: (error) => {
        console.error('Error:', error);
        const message = error.message || '予期しないエラーが発生しました';
        INTERCONNECT.showNotification(message, 'error');
    }
};

// Export for use in other scripts
window.INTERCONNECT = INTERCONNECT;