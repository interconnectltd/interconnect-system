/**
 * シェアモーダルハンドラー
 * 各SNSへのシェア機能の実装
 */

(function() {
    'use strict';

    console.log('[ShareModal] ハンドラー初期化');

    // 現在の紹介リンクURL
    let currentShareUrl = '';
    let currentShareText = '';

    // 初期化
    function initialize() {
        console.log('[ShareModal] 初期化開始');
        
        // デフォルトのシェアテキストを設定
        const shareMessageElement = document.getElementById('share-message');
        if (shareMessageElement) {
            currentShareText = shareMessageElement.value;
        }
        
        // 現在のページURLまたは紹介リンクを取得
        setupShareUrl();
    }

    // シェアURLの設定
    function setupShareUrl() {
        // 紹介リンクが表示されている場合はそれを使用
        const inviteLinkElement = document.querySelector('.invite-link-url');
        if (inviteLinkElement) {
            currentShareUrl = inviteLinkElement.textContent;
            console.log('[ShareModal] 紹介リンクを使用:', currentShareUrl);
        } else {
            // なければ現在のページURL
            currentShareUrl = window.location.href;
            console.log('[ShareModal] 現在のページURLを使用:', currentShareUrl);
        }
    }

    // シェアモーダルを開く
    window.openShareModal = function(linkUrl) {
        console.log('[ShareModal] モーダルを開く:', linkUrl);
        
        if (linkUrl) {
            currentShareUrl = linkUrl;
        }
        
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // テキストエリアの内容を更新
            updateShareMessage();
        } else {
            console.error('[ShareModal] share-modal要素が見つかりません');
        }
    };

    // シェアモーダルを閉じる
    window.closeShareModal = function() {
        console.log('[ShareModal] モーダルを閉じる');
        
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    // シェアメッセージを更新
    function updateShareMessage() {
        const shareMessageElement = document.getElementById('share-message');
        if (shareMessageElement) {
            // URLを含めたメッセージに更新
            const baseMessage = `経営者向けAI活用コミュニティ「INTERCONNECT」をご存知ですか？

AIを活用した次世代のビジネスマッチングサービスで、経営者同士の出会いから新しいビジネスチャンスが生まれています。

今なら無料面談を受けられるので、ぜひこちらのリンクからご登録ください。`;
            
            shareMessageElement.value = baseMessage;
            currentShareText = baseMessage;
        }
    }

    // Twitterでシェア
    window.shareToTwitter = function() {
        console.log('[ShareModal] Twitterでシェア');
        
        const text = encodeURIComponent(currentShareText);
        const url = encodeURIComponent(currentShareUrl);
        const hashtags = encodeURIComponent('INTERCONNECT,AI活用,ビジネスマッチング');
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`;
        
        window.open(twitterUrl, '_blank', 'width=600,height=400');
        
        // アナリティクス記録
        trackShare('twitter');
    };

    // LINEでシェア
    window.shareToLine = function() {
        console.log('[ShareModal] LINEでシェア');
        
        const text = encodeURIComponent(`${currentShareText}\n\n${currentShareUrl}`);
        const lineUrl = `https://line.me/R/msg/text/?${text}`;
        
        // モバイルの場合はアプリを開く
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            window.location.href = lineUrl;
        } else {
            window.open(lineUrl, '_blank', 'width=600,height=400');
        }
        
        // アナリティクス記録
        trackShare('line');
    };

    // Facebookでシェア
    window.shareToFacebook = function() {
        console.log('[ShareModal] Facebookでシェア');
        
        const url = encodeURIComponent(currentShareUrl);
        const quote = encodeURIComponent(currentShareText);
        
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`;
        
        window.open(facebookUrl, '_blank', 'width=600,height=400');
        
        // アナリティクス記録
        trackShare('facebook');
    };

    // メールでシェア
    window.shareByEmail = function() {
        console.log('[ShareModal] メールでシェア');
        
        const subject = encodeURIComponent('INTERCONNECTのご紹介');
        const body = encodeURIComponent(`${currentShareText}\n\n詳細はこちら:\n${currentShareUrl}`);
        
        const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
        
        window.location.href = mailtoUrl;
        
        // アナリティクス記録
        trackShare('email');
    };

    // コピー機能（追加）
    window.copyShareLink = function() {
        console.log('[ShareModal] リンクをコピー');
        
        const tempInput = document.createElement('input');
        tempInput.value = currentShareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        // フィードバック表示
        showCopyFeedback();
        
        // アナリティクス記録
        trackShare('copy');
    };

    // コピー完了フィードバック
    function showCopyFeedback() {
        const button = event.target.closest('button');
        if (button) {
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i><span>コピーしました！</span>';
            button.classList.add('success');
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('success');
            }, 2000);
        }
    }

    // シェアアナリティクス
    function trackShare(platform) {
        console.log(`[ShareModal] ${platform}でシェアされました`);
        
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'share', {
                method: platform,
                content_type: 'referral_link',
                item_id: currentShareUrl
            });
        }
        
        // Supabaseに記録
        if (window.supabaseClient) {
            recordShareActivity(platform);
        }
    }

    // Supabaseにシェア活動を記録
    async function recordShareActivity(platform) {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) return;
            
            const { error } = await window.supabaseClient
                .from('share_activities')
                .insert({
                    user_id: user.id,
                    platform: platform,
                    share_url: currentShareUrl,
                    shared_at: new Date().toISOString()
                });
            
            if (error) {
                console.error('[ShareModal] シェア記録エラー:', error);
            } else {
                console.log('[ShareModal] シェア活動を記録しました');
            }
        } catch (error) {
            console.error('[ShareModal] シェア記録エラー:', error);
        }
    }

    // モーダル外クリックで閉じる
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('share-modal');
        if (modal && e.target === modal) {
            closeShareModal();
        }
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('share-modal');
            if (modal && modal.classList.contains('active')) {
                closeShareModal();
            }
        }
    });

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // グローバルAPIとして公開
    window.ShareModalHandler = {
        openShareModal: window.openShareModal,
        closeShareModal: window.closeShareModal,
        shareToTwitter: window.shareToTwitter,
        shareToLine: window.shareToLine,
        shareToFacebook: window.shareToFacebook,
        shareByEmail: window.shareByEmail,
        copyShareLink: window.copyShareLink
    };

})();