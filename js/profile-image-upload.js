/**
 * プロフィール画像アップロード機能
 * 
 * 機能:
 * - プロフィール画像のアップロード
 * - カバー画像のアップロード
 * - 画像のリサイズ・最適化
 * - Supabase Storageへの保存
 */

(function() {
    'use strict';

    // console.log('[ProfileImageUpload] プロフィール画像アップロード機能初期化');

    // グローバル変数
    let currentUserId = null;
    let selectedAvatarFile = null;
    let selectedCoverFile = null;

    // 初期化
    async function initialize() {
        // console.log('[ProfileImageUpload] 初期化開始');

        // Supabaseの準備を待つ
        await window.waitForSupabase();

        // 現在のユーザーを取得
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            console.error('[ProfileImageUpload] ユーザーが認証されていません');
            return;
        }

        currentUserId = user.id;
        // console.log('[ProfileImageUpload] ユーザーID:', currentUserId);

        // イベントリスナーの設定
        setupEventListeners();
    }

    // イベントリスナーの設定
    function setupEventListeners() {
        // アバター編集ボタン
        const avatarEditBtn = document.querySelector('.btn-edit-avatar');
        if (avatarEditBtn) {
            avatarEditBtn.addEventListener('click', openAvatarModal);
        }

        // カバー編集ボタン
        const coverEditBtn = document.querySelector('.btn-edit-cover');
        if (coverEditBtn) {
            coverEditBtn.addEventListener('click', openCoverModal);
        }

        // アバターアップロード入力
        const avatarInput = document.getElementById('avatar-upload');
        if (avatarInput) {
            avatarInput.addEventListener('change', handleAvatarSelect);
        }

        // カバーアップロード入力
        const coverInput = document.getElementById('cover-upload');
        if (coverInput) {
            coverInput.addEventListener('change', handleCoverSelect);
        }
    }

    // アバターモーダルを開く
    function openAvatarModal() {
        const modal = document.getElementById('avatarEditModal');
        if (modal) {
            modal.style.display = 'block';
            selectedAvatarFile = null;
            document.getElementById('avatar-preview').style.display = 'none';
            document.querySelector('#avatarEditModal .upload-placeholder').style.display = 'flex';
        }
    }

    // カバーモーダルを開く
    function openCoverModal() {
        const modal = document.getElementById('coverEditModal');
        if (modal) {
            modal.style.display = 'block';
            selectedCoverFile = null;
            document.getElementById('cover-preview').style.display = 'none';
            document.querySelector('#coverEditModal .upload-placeholder').style.display = 'flex';
        }
    }

    // アバター画像選択処理
    function handleAvatarSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // ファイルサイズチェック（5MB以下）
        if (file.size > 5 * 1024 * 1024) {
            showError('ファイルサイズは5MB以下にしてください');
            event.target.value = '';
            return;
        }

        // 画像ファイルかチェック
        if (!file.type.startsWith('image/')) {
            showError('画像ファイルを選択してください');
            event.target.value = '';
            return;
        }

        selectedAvatarFile = file;

        // プレビュー表示
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('avatar-preview');
            const placeholder = document.querySelector('#avatarEditModal .upload-placeholder');
            if (preview && placeholder) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }

    // カバー画像選択処理
    function handleCoverSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // ファイルサイズチェック（10MB以下）
        if (file.size > 10 * 1024 * 1024) {
            showError('ファイルサイズは10MB以下にしてください');
            event.target.value = '';
            return;
        }

        // 画像ファイルかチェック
        if (!file.type.startsWith('image/')) {
            showError('画像ファイルを選択してください');
            event.target.value = '';
            return;
        }

        selectedCoverFile = file;

        // プレビュー表示
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('cover-preview');
            const placeholder = document.querySelector('#coverEditModal .upload-placeholder');
            if (preview && placeholder) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }

    // アバター画像保存
    async function saveAvatarImage() {
        if (!selectedAvatarFile) {
            showError('画像を選択してください');
            return;
        }

        try {
            showLoading('アップロード中...');

            // 画像をリサイズ
            const resizedBlob = await resizeImage(selectedAvatarFile, 400, 400);

            // ファイル名を生成
            const timestamp = Date.now();
            const fileName = `${currentUserId}/avatar-${timestamp}.jpg`;

            // Supabase Storageにアップロード
            const { data, error } = await window.supabaseClient.storage
                .from('avatars')
                .upload(fileName, resizedBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            // 公開URLを取得
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // ユーザー情報を更新
            const { error: updateError } = await window.supabaseClient
                .from('profiles')
                .update({ 
                    picture_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentUserId);

            if (updateError) throw updateError;

            // プロフィール画像を即座に更新
            updateAvatarDisplay(publicUrl);

            // モーダルを閉じる
            closeAvatarModal();

            hideLoading();
            showSuccess('プロフィール画像を更新しました');

        } catch (error) {
            console.error('[ProfileImageUpload] アバター保存エラー:', error);
            hideLoading();
            showError('画像のアップロードに失敗しました');
        }
    }

    // カバー画像保存
    async function saveCoverImage() {
        if (!selectedCoverFile) {
            showError('画像を選択してください');
            return;
        }

        try {
            showLoading('アップロード中...');

            // 画像をリサイズ
            const resizedBlob = await resizeImage(selectedCoverFile, 1200, 300);

            // ファイル名を生成
            const timestamp = Date.now();
            const fileName = `${currentUserId}/cover-${timestamp}.jpg`;

            // Supabase Storageにアップロード
            const { data, error } = await window.supabaseClient.storage
                .from('covers')
                .upload(fileName, resizedBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            // 公開URLを取得
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('covers')
                .getPublicUrl(fileName);

            // ユーザー情報を更新
            const { error: updateError } = await window.supabaseClient
                .from('profiles')
                .update({ 
                    cover_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentUserId);

            if (updateError) throw updateError;

            // カバー画像を即座に更新
            updateCoverDisplay(publicUrl);

            // モーダルを閉じる
            closeCoverModal();

            hideLoading();
            showSuccess('カバー画像を更新しました');

        } catch (error) {
            console.error('[ProfileImageUpload] カバー保存エラー:', error);
            hideLoading();
            showError('画像のアップロードに失敗しました');
        }
    }

    // 画像リサイズ関数
    function resizeImage(file, maxWidth, maxHeight) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // アスペクト比を保持してリサイズ
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // 画像を描画
                    ctx.drawImage(img, 0, 0, width, height);

                    // JPEGとして出力
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.9);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // アバター表示更新
    function updateAvatarDisplay(url) {
        // プロフィールページのアバター
        const profileAvatar = document.querySelector('.profile-avatar img');
        if (profileAvatar) {
            profileAvatar.src = url;
        }

        // ヘッダーのアバター
        const headerAvatar = document.querySelector('.user-menu-btn img');
        if (headerAvatar) {
            headerAvatar.src = url;
        }

        // その他のアバター表示
        document.querySelectorAll('.user-avatar img, .profile-pic img').forEach(img => {
            img.src = url;
        });
    }

    // カバー表示更新
    function updateCoverDisplay(url) {
        const coverImg = document.querySelector('.profile-cover img');
        if (coverImg) {
            coverImg.src = url;
        }
    }

    // モーダルを閉じる
    function closeAvatarModal() {
        const modal = document.getElementById('avatarEditModal');
        if (modal) {
            modal.style.display = 'none';
            selectedAvatarFile = null;
            document.getElementById('avatar-upload').value = '';
        }
    }

    function closeCoverModal() {
        const modal = document.getElementById('coverEditModal');
        if (modal) {
            modal.style.display = 'none';
            selectedCoverFile = null;
            document.getElementById('cover-upload').value = '';
        }
    }

    // ローディング表示
    function showLoading(message = 'Loading...') {
        // 既存のローディングを削除
        const existing = document.querySelector('.upload-loading');
        if (existing) existing.remove();

        const loading = document.createElement('div');
        loading.className = 'upload-loading';
        loading.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(loading);
    }

    function hideLoading() {
        const loading = document.querySelector('.upload-loading');
        if (loading) loading.remove();
    }

    // ユーティリティ関数
    function showSuccess(message) {
        showToast(message, 'success');
    }

    function showError(message) {
        showToast(message, 'error');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // グローバルAPIとして公開
    window.ProfileImageUpload = {
        saveAvatarImage,
        saveCoverImage,
        closeAvatarModal,
        closeCoverModal
    };

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();