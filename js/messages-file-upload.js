/**
 * Messages File Upload
 * ファイルアップロード機能
 */

(function() {
    'use strict';

    console.log('[MessagesFileUpload] 初期化開始...');

    class MessagesFileUploadManager {
        constructor() {
            this.fileInput = document.getElementById('fileInput');
            this.attachBtn = document.getElementById('attachBtn');
            this.maxFileSize = 10 * 1024 * 1024; // 10MB
            this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            this.allowedFileTypes = [...this.allowedImageTypes, 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            
            this.init();
        }

        init() {
            if (!this.fileInput) {
                console.warn('[MessagesFileUpload] ファイル入力要素が見つかりません');
                return;
            }

            this.setupEventListeners();
        }

        /**
         * イベントリスナーを設定
         */
        setupEventListeners() {
            // ファイル選択
            this.fileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                    this.handleFileSelection(files[0]);
                }
            });

            // ドラッグ&ドロップ対応
            this.setupDragAndDrop();
        }

        /**
         * ドラッグ&ドロップの設定
         */
        setupDragAndDrop() {
            const messagesArea = document.getElementById('messagesArea');
            if (!messagesArea) return;

            let dragCounter = 0;

            // ドラッグエンター
            messagesArea.addEventListener('dragenter', (e) => {
                e.preventDefault();
                dragCounter++;
                if (dragCounter === 1) {
                    this.showDropZone();
                }
            });

            // ドラッグオーバー
            messagesArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            // ドラッグリーブ
            messagesArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dragCounter--;
                if (dragCounter === 0) {
                    this.hideDropZone();
                }
            });

            // ドロップ
            messagesArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dragCounter = 0;
                this.hideDropZone();

                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    this.handleFileSelection(files[0]);
                }
            });
        }

        /**
         * ドロップゾーンを表示
         */
        showDropZone() {
            const messagesArea = document.getElementById('messagesArea');
            if (!messagesArea) return;

            // 既存のドロップゾーンを削除
            this.hideDropZone();

            const dropZone = document.createElement('div');
            dropZone.className = 'file-drop-zone';
            dropZone.innerHTML = `
                <div class="drop-zone-content">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>ファイルをドロップしてアップロード</p>
                    <p class="drop-zone-hint">画像、PDF、Word文書に対応</p>
                </div>
            `;

            messagesArea.appendChild(dropZone);
        }

        /**
         * ドロップゾーンを非表示
         */
        hideDropZone() {
            const dropZone = document.querySelector('.file-drop-zone');
            if (dropZone) {
                dropZone.remove();
            }
        }

        /**
         * ファイル選択処理
         */
        async handleFileSelection(file) {
            // ファイルを検証
            const validation = this.validateFile(file);
            if (!validation.valid) {
                window.messagesUIManager?.showError(validation.error);
                return;
            }

            // プレビューを表示
            this.showFilePreview(file);

            // アップロード
            try {
                await this.uploadFile(file);
            } catch (error) {
                console.error('[MessagesFileUpload] アップロードエラー:', error);
                this.removeFilePreview();
                window.messagesUIManager?.showError('ファイルのアップロードに失敗しました');
            }
        }

        /**
         * ファイルを検証
         */
        validateFile(file) {
            // ファイルサイズチェック
            if (file.size > this.maxFileSize) {
                return {
                    valid: false,
                    error: `ファイルサイズは${this.maxFileSize / 1024 / 1024}MB以下にしてください`
                };
            }

            // ファイルタイプチェック
            if (!this.allowedFileTypes.includes(file.type)) {
                return {
                    valid: false,
                    error: 'サポートされていないファイル形式です'
                };
            }

            return { valid: true };
        }

        /**
         * ファイルプレビューを表示
         */
        showFilePreview(file) {
            const container = document.querySelector('.message-input-container');
            if (!container) return;

            // 既存のプレビューを削除
            this.removeFilePreview();

            const preview = document.createElement('div');
            preview.className = 'file-preview';
            preview.id = 'filePreview';

            if (this.allowedImageTypes.includes(file.type)) {
                // 画像の場合
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="${file.name}">
                        <div class="file-preview-info">
                            <div class="file-preview-name">${this.truncateFileName(file.name)}</div>
                            <div class="file-preview-size">${this.formatFileSize(file.size)}</div>
                        </div>
                        <button class="file-preview-remove" onclick="window.messagesFileUploadManager.removeFilePreview()">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                // その他のファイル
                const icon = this.getFileIcon(file.type);
                preview.innerHTML = `
                    <div class="file-preview-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="file-preview-info">
                        <div class="file-preview-name">${this.truncateFileName(file.name)}</div>
                        <div class="file-preview-size">${this.formatFileSize(file.size)}</div>
                    </div>
                    <button class="file-preview-remove" onclick="window.messagesFileUploadManager.removeFilePreview()">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }

            container.insertBefore(preview, container.firstChild);

            // アップロード進捗を追加
            this.addUploadProgress(preview);
        }

        /**
         * ファイルプレビューを削除
         */
        removeFilePreview() {
            const preview = document.getElementById('filePreview');
            if (preview) {
                preview.remove();
            }
            
            // ファイル入力をリセット
            if (this.fileInput) {
                this.fileInput.value = '';
            }
        }

        /**
         * アップロード進捗を追加
         */
        addUploadProgress(previewElement) {
            const progress = document.createElement('div');
            progress.className = 'file-upload-progress';
            progress.innerHTML = '<div class="progress-bar"></div>';
            previewElement.appendChild(progress);
        }

        /**
         * アップロード進捗を更新
         */
        updateUploadProgress(percentage) {
            const progressBar = document.querySelector('.file-upload-progress .progress-bar');
            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
            }
        }

        /**
         * ファイルをアップロード
         */
        async uploadFile(file) {
            // Supabaseストレージが利用可能か確認
            if (!window.supabase) {
                console.warn('[MessagesFileUpload] Supabaseが利用できません。ダミーアップロードを実行します。');
                return this.dummyUpload(file);
            }

            try {
                // ファイル名を生成（タイムスタンプ付き）
                const timestamp = Date.now();
                const fileName = `${timestamp}_${file.name}`;
                const filePath = `messages/${window.messagesSupabaseManager?.userId}/${fileName}`;

                // アップロード（プログレス付き）
                const { data, error } = await window.supabase.storage
                    .from('files')
                    .upload(filePath, file, {
                        onUploadProgress: (progress) => {
                            const percentage = (progress.loaded / progress.total) * 100;
                            this.updateUploadProgress(percentage);
                        }
                    });

                if (error) throw error;

                // 公開URLを取得
                const { data: publicUrl } = window.supabase.storage
                    .from('files')
                    .getPublicUrl(filePath);

                // メッセージとして送信
                await this.sendFileMessage(file, publicUrl.publicUrl);

                // プレビューを削除
                setTimeout(() => this.removeFilePreview(), 1000);

            } catch (error) {
                console.error('[MessagesFileUpload] アップロードエラー:', error);
                throw error;
            }
        }

        /**
         * ダミーアップロード（開発用）
         */
        async dummyUpload(file) {
            // アップロードシミュレーション
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                this.updateUploadProgress(progress);
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // ダミーURLでメッセージ送信
                    const dummyUrl = URL.createObjectURL(file);
                    this.sendFileMessage(file, dummyUrl);
                    
                    // プレビューを削除
                    setTimeout(() => this.removeFilePreview(), 1000);
                }
            }, 100);
        }

        /**
         * ファイルメッセージを送信
         */
        async sendFileMessage(file, fileUrl) {
            let messageContent = '';
            const isImage = this.allowedImageTypes.includes(file.type);

            if (isImage) {
                messageContent = `画像を送信しました: ${file.name}`;
            } else {
                messageContent = `ファイルを送信しました: ${file.name}`;
            }

            // メッセージを送信
            if (window.messagesSupabaseManager) {
                await window.messagesSupabaseManager.sendMessage(
                    messageContent,
                    isImage ? 'image' : 'file',
                    fileUrl
                );
            }
        }

        /**
         * ファイル名を短縮
         */
        truncateFileName(name, maxLength = 30) {
            if (name.length <= maxLength) return name;
            
            const extension = name.split('.').pop();
            const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
            const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
            
            return `${truncatedName}...${extension}`;
        }

        /**
         * ファイルサイズをフォーマット
         */
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        /**
         * ファイルアイコンを取得
         */
        getFileIcon(mimeType) {
            if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
            if (mimeType.includes('word')) return 'fas fa-file-word';
            if (mimeType.includes('excel')) return 'fas fa-file-excel';
            if (mimeType.includes('powerpoint')) return 'fas fa-file-powerpoint';
            return 'fas fa-file';
        }
    }

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        /* ファイルドロップゾーン */
        .file-drop-zone {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 102, 255, 0.1);
            border: 2px dashed var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }

        .drop-zone-content {
            text-align: center;
            pointer-events: none;
        }

        .drop-zone-content i {
            font-size: 3rem;
            color: var(--primary-color);
            margin-bottom: 1rem;
        }

        .drop-zone-content p {
            font-size: 1.125rem;
            font-weight: 500;
            color: var(--primary-color);
            margin: 0;
        }

        .drop-zone-hint {
            font-size: 0.875rem !important;
            font-weight: normal !important;
            opacity: 0.8;
            margin-top: 0.5rem !important;
        }

        /* ファイルプレビュー */
        .file-preview {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-sm);
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
            margin-bottom: var(--space-sm);
            position: relative;
            overflow: hidden;
        }

        .file-preview img {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: var(--radius-sm);
        }

        .file-preview-icon {
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            border-radius: var(--radius-sm);
            font-size: 1.5rem;
            color: var(--primary-color);
        }

        .file-preview-info {
            flex: 1;
            min-width: 0;
        }

        .file-preview-name {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .file-preview-size {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }

        .file-preview-remove {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: var(--space-xs);
            transition: color 0.2s ease;
        }

        .file-preview-remove:hover {
            color: var(--danger-color);
        }

        /* アップロード進捗 */
        .file-upload-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: rgba(0, 0, 0, 0.1);
        }

        .file-upload-progress .progress-bar {
            height: 100%;
            background: var(--primary-color);
            width: 0;
            transition: width 0.3s ease;
        }

        /* メッセージ内のファイル表示 */
        .message-file {
            display: inline-flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-sm);
            background: rgba(0, 0, 0, 0.05);
            border-radius: var(--radius-sm);
            margin-top: var(--space-xs);
            text-decoration: none;
            color: inherit;
        }

        .message-file:hover {
            background: rgba(0, 0, 0, 0.1);
        }

        .message-file i {
            font-size: 1.25rem;
            color: var(--primary-color);
        }

        .message-image {
            max-width: 300px;
            max-height: 300px;
            border-radius: var(--radius-md);
            margin-top: var(--space-sm);
            cursor: pointer;
        }

        .message-image:hover {
            opacity: 0.9;
        }
    `;
    document.head.appendChild(style);

    // 初期化
    window.messagesFileUploadManager = new MessagesFileUploadManager();

})();