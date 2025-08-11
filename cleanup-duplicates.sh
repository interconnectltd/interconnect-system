#!/bin/bash

echo "🧹 重複・不要ファイルのクリーンアップ"
echo "======================================="
echo ""

# バックアップディレクトリを作成
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 1. バックアップフォルダを移動
echo "📦 バックアップフォルダを整理中..."
if [ -d "css/backup-referral-css" ]; then
    mv "css/backup-referral-css" "$BACKUP_DIR/"
    echo "  ✅ css/backup-referral-css を移動"
fi

if [ -d "css/_old_referral_css" ]; then
    mv "css/_old_referral_css" "$BACKUP_DIR/"
    echo "  ✅ css/_old_referral_css を移動"
fi

if [ -d "css/backup" ]; then
    mv "css/backup" "$BACKUP_DIR/"
    echo "  ✅ css/backup を移動"
fi

if [ -d "js/backup" ]; then
    mv "js/backup" "$BACKUP_DIR/"
    echo "  ✅ js/backup を移動"
fi

if [ -d "js/_old_supabase" ]; then
    mv "js/_old_supabase" "$BACKUP_DIR/"
    echo "  ✅ js/_old_supabase を移動"
fi

# 2. -old ファイルを移動
echo ""
echo "📝 -oldファイルを移動中..."
find . -name "*-old.*" -not -path "./node_modules/*" -not -path "./$BACKUP_DIR/*" | while read file; do
    mv "$file" "$BACKUP_DIR/"
    echo "  ✅ $(basename "$file") を移動"
done

# 3. -debug ファイルを移動（本番環境では不要）
echo ""
echo "🐛 -debugファイルを移動中..."
find . -name "*-debug.*" -not -path "./node_modules/*" -not -path "./$BACKUP_DIR/*" | while read file; do
    mv "$file" "$BACKUP_DIR/"
    echo "  ✅ $(basename "$file") を移動"
done

# 4. 一部の-fixファイルは残す（必要なものもあるため）
echo ""
echo "🔧 不要な-fixファイルを確認中..."
CRITICAL_FIX_FILES=(
    "css/header-padding-fix.css"
    "css/sidebar-responsive-fix.css"
    "css/register-ui-fix.css"
)

find . -name "*-fix.*" -not -path "./node_modules/*" -not -path "./$BACKUP_DIR/*" | while read file; do
    # 重要なfixファイルかチェック
    IS_CRITICAL=0
    for critical in "${CRITICAL_FIX_FILES[@]}"; do
        if [[ "$file" == *"$critical"* ]]; then
            IS_CRITICAL=1
            break
        fi
    done
    
    if [ $IS_CRITICAL -eq 0 ]; then
        echo "  ⚠️  $(basename "$file") - 要確認"
    else
        echo "  ✅ $(basename "$file") - 保持"
    fi
done

# 5. レポート生成
echo ""
echo "📊 クリーンアップレポート生成中..."
echo "=== クリーンアップレポート $(date) ===" > cleanup-report.txt
echo "" >> cleanup-report.txt
echo "バックアップディレクトリ: $BACKUP_DIR" >> cleanup-report.txt
echo "" >> cleanup-report.txt
echo "移動されたファイル数:" >> cleanup-report.txt
find "$BACKUP_DIR" -type f | wc -l >> cleanup-report.txt
echo "" >> cleanup-report.txt
echo "削減されたサイズ:" >> cleanup-report.txt
du -sh "$BACKUP_DIR" >> cleanup-report.txt

echo ""
echo "✅ クリーンアップ完了"
echo "📁 バックアップは $BACKUP_DIR に保存されました"
echo "📄 詳細は cleanup-report.txt を確認"
echo ""
echo "⚠️  次のステップ:"
echo "1. アプリケーションの動作確認"
echo "2. 問題がなければ $BACKUP_DIR を削除"
echo "3. rm -rf $BACKUP_DIR"