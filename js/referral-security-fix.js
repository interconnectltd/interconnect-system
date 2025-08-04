/**
 * 紹介ページセキュリティ修正
 * XSS脆弱性の修正とエラーハンドリングの改善
 */

// HTMLエスケープ関数
function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 安全なHTML生成のためのヘルパー
window.safeHtml = {
    escape: escapeHtml,
    
    // 安全な要素作成
    createElement: function(tag, attrs = {}, content = '') {
        const element = document.createElement(tag);
        
        // 属性の設定
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else if (key === 'id' || key === 'href' || key === 'src') {
                element[key] = value;
            }
        });
        
        // コンテンツの設定
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        }
        
        return element;
    },
    
    // 安全なHTMLテンプレート
    template: function(strings, ...values) {
        let result = strings[0];
        for (let i = 0; i < values.length; i++) {
            result += escapeHtml(values[i]) + strings[i + 1];
        }
        return result;
    }
};

// エラーバウンダリー
window.referralErrorBoundary = {
    handleError: function(error, context = 'Unknown') {
        console.error(`[Referral Error - ${context}]:`, error);
        
        // ユーザーへの通知
        if (typeof INTERCONNECT !== 'undefined' && INTERCONNECT.showNotification) {
            INTERCONNECT.showNotification('エラーが発生しました。ページをリロードしてください。', 'error');
        }
        
        // エラーレポート（将来的な実装用）
        // this.reportError(error, context);
    },
    
    wrapAsync: function(fn, context) {
        return async function(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                window.referralErrorBoundary.handleError(error, context);
                throw error;
            }
        };
    }
};

// グローバルエラーハンドラーの追加
window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('referral')) {
        window.referralErrorBoundary.handleError(event.error, 'Global');
        event.preventDefault();
    }
});

window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.toString().includes('referral')) {
        window.referralErrorBoundary.handleError(event.reason, 'Promise Rejection');
        event.preventDefault();
    }
});

// 既存のreferralManagerのメソッドをラップ
document.addEventListener('DOMContentLoaded', () => {
    if (window.referralManager) {
        // 危険なメソッドをセキュアバージョンでオーバーライド
        const originalRenderLinkItem = window.referralManager.renderLinkItem;
        window.referralManager.renderLinkItem = function(link) {
            // HTMLをエスケープして安全に
            const safeLink = {
                ...link,
                description: escapeHtml(link.description),
                link_code: escapeHtml(link.link_code)
            };
            return originalRenderLinkItem.call(this, safeLink);
        };
        
        const originalRenderReferralItem = window.referralManager.renderReferralItem;
        window.referralManager.renderReferralItem = function(referral) {
            // HTMLをエスケープして安全に
            const safeReferral = {
                ...referral,
                invitee_name: escapeHtml(referral.invitee_name),
                invitee_email: escapeHtml(referral.invitee_email)
            };
            return originalRenderReferralItem.call(this, safeReferral);
        };
    }
});