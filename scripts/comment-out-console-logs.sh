#!/bin/bash

echo "📝 console.logをコメントアウト中..."
echo "================================"
echo ""

# 対象ファイル数をカウント
TOTAL_FILES=$(find js -name "*.js" -not -path "*/node_modules/*" 2>/dev/null | wc -l)
echo "対象JSファイル: $TOTAL_FILES 個"
echo ""

# 処理カウンタ
PROCESSED=0
MODIFIED=0

# JSファイルを処理
find js -name "*.js" -not -path "*/node_modules/*" 2>/dev/null | while read file; do
    # console.logを含む行数を確認
    COUNT=$(grep -c "^[[:space:]]*console\.log" "$file" 2>/dev/null || echo 0)
    
    if [ $COUNT -gt 0 ]; then
        # バックアップを作成
        cp "$file" "$file.bak"
        
        # console.logをコメントアウト
        # 既にコメントアウトされているものは除外
        sed -i 's/^\([[:space:]]*\)console\.log/\1\/\/ console.log/g' "$file"
        
        echo "✅ $(basename "$file"): $COUNT 箇所をコメントアウト"
        MODIFIED=$((MODIFIED + 1))
        
        # バックアップを削除（成功時のみ）
        if [ $? -eq 0 ]; then
            rm "$file.bak"
        fi
    fi
    
    PROCESSED=$((PROCESSED + 1))
done

echo ""
echo "📊 処理完了"
echo "処理ファイル数: $PROCESSED"
echo "修正ファイル数: $MODIFIED"
echo ""
echo "⚠️  注意: デバッグが必要な場合は、コメントを解除してください"