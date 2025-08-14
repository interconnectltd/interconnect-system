#!/bin/bash

# 自動同期スクリプト（改良版）
WINDOWS_DIR="/mnt/c/Users/ooxmi/Downloads/Ver.006【コード】INTERCONNECT"
PROJECT_DIR="/home/ooxmichaelxoo/INTERCONNECT_project"

echo "🔄 自動同期を開始します..."
echo "Windowsフォルダ: $WINDOWS_DIR"
echo "プロジェクト: $PROJECT_DIR"

cd "$PROJECT_DIR"

while true; do
    echo ""
    echo "📋 $(date '+%Y-%m-%d %H:%M:%S') - 同期チェック中..."
    
    # 必要なディレクトリを作成
    mkdir -p js css assets config includes supabase
    
    # Windowsフォルダからコピー
    cp -r "$WINDOWS_DIR"/* . 2>/dev/null || true
    
    # Git状態確認
    if [ -n "$(git status --porcelain)" ]; then
        echo "✅ 変更を検出しました"
        
        # 変更をコミット
        git add -A
        git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
        
        # GitHubへプッシュ（エラーがあれば再試行）
        if ! git push origin main; then
            echo "⚠️  プッシュエラー。リベースして再試行..."
            git pull origin main --rebase
            git push origin main --force-with-lease
        fi
        
        echo "🚀 同期完了！"
    else
        echo "ℹ️  変更なし"
    fi
    
    sleep 10
done