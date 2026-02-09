#!/bin/bash

echo "🚨 緊急クリーンアップスクリプト"
echo "================================"
echo ""

# 実行確認
read -p "⚠️  バックアップファイルを削除します。続行しますか？ (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 1
fi

# 削除対象リスト作成
echo "📊 削除対象ファイルを調査中..."

# バックアップファイル
BACKUP_FILES=$(find . -type f \( \
    -name "*backup*" -o \
    -name "*old*" -o \
    -name "*-fix.*" -o \
    -name "*_fix.*" -o \
    -name "*-debug.*" -o \
    -name "*_debug.*" -o \
    -name "*.bak" -o \
    -name "*~" \
\) -not -path "./node_modules/*" 2>/dev/null)

# カウント
BACKUP_COUNT=$(echo "$BACKUP_FILES" | grep -c .)
BACKUP_SIZE=$(echo "$BACKUP_FILES" | xargs -r du -ch 2>/dev/null | tail -1 | cut -f1)

echo "見つかったバックアップファイル: $BACKUP_COUNT 個"
echo "合計サイズ: $BACKUP_SIZE"
echo ""

# 削除前レポート生成
echo "📝 削除レポート生成中..."
echo "=== 削除対象ファイル $(date) ===" > cleanup-report.txt
echo "" >> cleanup-report.txt
echo "$BACKUP_FILES" >> cleanup-report.txt

# 削除実行
echo "🗑️  ファイル削除中..."
echo "$BACKUP_FILES" | while read -r file; do
    if [[ -f "$file" ]]; then
        rm -f "$file"
        echo "  ✅ 削除: $(basename "$file")"
    fi
done

# console.log削除
echo ""
echo "📋 console.log削除中..."
JS_FILES=$(find . -name "*.js" -not -path "./node_modules/*" 2>/dev/null)
CONSOLE_COUNT=0

echo "$JS_FILES" | while read -r file; do
    if [[ -f "$file" ]]; then
        # console.logを含む行数をカウント
        COUNT=$(grep -c "console\.log" "$file" 2>/dev/null || echo 0)
        if [[ $COUNT -gt 0 ]]; then
            # console.logをコメントアウト（完全削除は危険）
            sed -i 's/console\.log/\/\/ console\.log/g' "$file"
            echo "  📝 $file: $COUNT 箇所をコメントアウト"
            CONSOLE_COUNT=$((CONSOLE_COUNT + COUNT))
        fi
    fi
done

# alert()をtoast通知に変換する準備
echo ""
echo "⚠️  alert()検出中..."
ALERT_FILES=$(grep -l "alert(" . -r --include="*.js" --include="*.html" --exclude-dir=node_modules 2>/dev/null)
ALERT_COUNT=$(echo "$ALERT_FILES" | wc -l)
echo "alert()使用ファイル: $ALERT_COUNT 個"

# 重複IDチェック
echo ""
echo "🆔 重複ID検出中..."
HTML_FILES=$(find . -name "*.html" -not -path "./node_modules/*" 2>/dev/null)
DUPLICATE_IDS=""

# よく使われるIDをチェック
for id in userAvatar userName logoutBtn sidebarToggle; do
    COUNT=$(grep -h "id=\"$id\"" $HTML_FILES 2>/dev/null | wc -l)
    if [[ $COUNT -gt 1 ]]; then
        echo "  ⚠️  ID '$id' が $COUNT 箇所で使用"
        DUPLICATE_IDS="$DUPLICATE_IDS $id($COUNT)"
    fi
done

# 最終レポート
echo ""
echo "========================================="
echo "📊 クリーンアップ完了レポート"
echo "========================================="
echo "削除されたファイル: $BACKUP_COUNT 個"
echo "解放された容量: $BACKUP_SIZE"
echo "コメントアウトされたconsole.log: 多数"
echo "alert()要修正: $ALERT_COUNT ファイル"
echo "重複ID: $DUPLICATE_IDS"
echo ""
echo "詳細は cleanup-report.txt を確認"
echo ""
echo "⚠️  次のステップ:"
echo "1. git status で変更を確認"
echo "2. 動作テストを実施"
echo "3. 問題なければコミット"