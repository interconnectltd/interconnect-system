#!/bin/bash

# スマート自動同期スクリプト（頻度を制御）
WINDOWS_DIR="/mnt/c/Users/ooxmi/Downloads/Ver.006【コード】INTERCONNECT"
PROJECT_DIR="/home/ooxmichaelxoo/INTERCONNECT_project"
LAST_SYNC_FILE="$PROJECT_DIR/.last_sync"
MIN_INTERVAL=300  # 最小同期間隔（5分）

echo "🔄 スマート自動同期を開始します..."
echo "最小同期間隔: ${MIN_INTERVAL}秒（5分）"

cd "$PROJECT_DIR"

while true; do
    # 必要なディレクトリを作成
    mkdir -p js css assets config includes supabase
    
    # Windowsフォルダからコピー
    cp -r "$WINDOWS_DIR"/* . 2>/dev/null || true
    
    # Git状態確認
    if [ -n "$(git status --porcelain)" ]; then
        # 最後の同期時刻を確認
        if [ -f "$LAST_SYNC_FILE" ]; then
            LAST_SYNC=$(cat "$LAST_SYNC_FILE")
            CURRENT_TIME=$(date +%s)
            TIME_DIFF=$((CURRENT_TIME - LAST_SYNC))
            
            if [ $TIME_DIFF -lt $MIN_INTERVAL ]; then
                echo "⏳ 前回の同期から${TIME_DIFF}秒しか経過していません。"
                echo "   次の同期まで$((MIN_INTERVAL - TIME_DIFF))秒待機します..."
                sleep $((MIN_INTERVAL - TIME_DIFF))
            fi
        fi
        
        echo "✅ $(date '+%Y-%m-%d %H:%M:%S') - 変更を同期します"
        
        # 変更をコミット
        git add -A
        git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
        
        # GitHubへプッシュ
        if git push origin main; then
            echo "🚀 同期完了！"
            # 最後の同期時刻を記録
            date +%s > "$LAST_SYNC_FILE"
        else
            echo "⚠️  プッシュエラー。リベースして再試行..."
            git pull origin main --rebase
            git push origin main --force-with-lease
            date +%s > "$LAST_SYNC_FILE"
        fi
    else
        echo "ℹ️  $(date '+%H:%M:%S') - 変更なし"
    fi
    
    sleep 30  # 30秒ごとにチェック
done