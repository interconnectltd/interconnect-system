#!/bin/bash
# Windows側のVer.008フォルダに自動同期するスクリプト

# 同期先のWindowsパス（WSL2から見たパス）
WINDOWS_PATH="/mnt/c/Users/ooxmi/Downloads/Ver.008【コード】INTERCONNECT"

# 同期元（現在のプロジェクトディレクトリ）
SOURCE_PATH="/home/ooxmichaelxoo/INTERCONNECT_project"

# 色付きログ出力
log_info() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[0;33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Windowsパスが存在するか確認
if [ ! -d "$WINDOWS_PATH" ]; then
    log_error "Windows側のディレクトリが見つかりません: $WINDOWS_PATH"
    log_info "ディレクトリを作成します..."
    mkdir -p "$WINDOWS_PATH"
fi

# 不要なファイルを削除する関数
clean_unnecessary_files() {
    log_info "不要なファイルをクリーンアップ中..."
    
    # 削除対象のパターン
    PATTERNS=(
        "*.log"
        "*.tmp"
        "*.bak"
        "*.swp"
        ".DS_Store"
        "Thumbs.db"
        "desktop.ini"
        "node_modules/"
        ".git/"
        "__pycache__/"
        "*.pyc"
        ".env.local"
        ".env.*.local"
        "npm-debug.log*"
        "yarn-debug.log*"
        "yarn-error.log*"
    )
    
    # Windows側の不要ファイルを削除
    for pattern in "${PATTERNS[@]}"; do
        find "$WINDOWS_PATH" -name "$pattern" -type f -delete 2>/dev/null
        find "$WINDOWS_PATH" -name "$pattern" -type d -exec rm -rf {} + 2>/dev/null
    done
    
    log_info "クリーンアップ完了"
}

# rsyncで同期（不要なファイルを除外）
sync_files() {
    log_info "ファイル同期を開始します..."
    log_info "同期元: $SOURCE_PATH"
    log_info "同期先: $WINDOWS_PATH"
    
    # rsyncオプション
    # -a: アーカイブモード（権限、タイムスタンプを保持）
    # -v: 詳細表示
    # -h: 人間が読みやすい形式
    # --delete: 同期先にしかないファイルを削除
    # --exclude: 除外パターン
    
    rsync -avh --delete \
        --exclude='.git/' \
        --exclude='node_modules/' \
        --exclude='*.log' \
        --exclude='*.tmp' \
        --exclude='*.bak' \
        --exclude='*.swp' \
        --exclude='.DS_Store' \
        --exclude='Thumbs.db' \
        --exclude='__pycache__/' \
        --exclude='*.pyc' \
        --exclude='.env' \
        --exclude='.env.*' \
        --exclude='package-lock.json' \
        --exclude='yarn.lock' \
        --exclude='.gitignore' \
        --exclude='README.md' \
        --exclude='scripts/' \
        --exclude='sql-archive/' \
        --exclude='test/' \
        --exclude='tests/' \
        --exclude='*.test.js' \
        --exclude='*.spec.js' \
        --exclude='coverage/' \
        --exclude='.vscode/' \
        --exclude='.idea/' \
        "$SOURCE_PATH/" "$WINDOWS_PATH/"
    
    if [ $? -eq 0 ]; then
        log_info "同期が正常に完了しました"
    else
        log_error "同期中にエラーが発生しました"
        return 1
    fi
}

# メイン処理
main() {
    log_info "=== Windows同期スクリプト開始 ==="
    log_info "$(date '+%Y-%m-%d %H:%M:%S')"
    
    # 1. 不要ファイルのクリーンアップ
    clean_unnecessary_files
    
    # 2. ファイル同期
    sync_files
    
    # 3. 同期結果の確認
    if [ $? -eq 0 ]; then
        log_info "すべての処理が完了しました"
        
        # ファイル数の確認
        TOTAL_FILES=$(find "$WINDOWS_PATH" -type f | wc -l)
        TOTAL_DIRS=$(find "$WINDOWS_PATH" -type d | wc -l)
        
        log_info "同期されたファイル数: $TOTAL_FILES"
        log_info "同期されたディレクトリ数: $TOTAL_DIRS"
    else
        log_error "処理中にエラーが発生しました"
        exit 1
    fi
    
    log_info "=== 同期完了 ==="
}

# スクリプト実行
main