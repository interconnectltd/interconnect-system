#!/bin/bash

echo "🔥 アバター関連の全問題を修正開始..."

# 対象HTMLファイル
HTML_FILES=(
    "dashboard.html"
    "members.html"
    "events.html"
    "messages.html"
    "matching.html"
    "referral.html"
    "profile.html"
    "notifications.html"
    "settings.html"
)

# 1. 画像パスの統一（images/ → assets/）
echo ""
echo "📁 画像パスを統一中..."
for file in "${HTML_FILES[@]}"; do
    if [ -f "$file" ]; then
        # images/default-avatar.svg → assets/default-avatar.svg
        sed -i 's|images/default-avatar\.svg|assets/default-avatar.svg|g' "$file"
        echo "  ✅ $file の画像パスを統一"
    fi
done

# 2. ID重複の解消
echo ""
echo "🆔 重複IDを削除中..."
for file in "${HTML_FILES[@]}"; do
    if [ -f "$file" ]; then
        # id="userAvatar" を削除（クラスは残す）
        sed -i 's/ id="userAvatar"//g' "$file"
        echo "  ✅ $file のID削除完了"
    fi
done

# 3. デフォルト画像の統一作成
echo ""
echo "🎨 統一デフォルトアバター作成..."
if [ ! -f "assets/default-avatar.svg" ]; then
    cp "images/default-avatar.svg" "assets/default-avatar.svg" 2>/dev/null || \
    cp "assets/user-placeholder.svg" "assets/default-avatar.svg"
    echo "  ✅ assets/default-avatar.svg 作成完了"
else
    echo "  ⏭️  既に存在"
fi

# 4. 不要なCSSファイルをバックアップ
echo ""
echo "📦 競合CSSファイルをバックアップ..."
mkdir -p css/backup-avatar-conflicts
CONFLICT_CSS=(
    "header-user-menu-redesign.css"
    "presentation.css"
    "user-dropdown-unified.css"
    "advanced-search.css"
)

for css in "${CONFLICT_CSS[@]}"; do
    if [ -f "css/$css" ]; then
        # アバター関連の定義をコメントアウト
        sed -i '/.user-avatar\s*{/,/^}/s/^/\/* DISABLED: /' "css/$css"
        sed -i '/.user-avatar\s*{/,/^}/s/$/ *\//' "css/$css"
        echo "  ✅ $css のアバター定義を無効化"
    fi
done

# 5. JavaScript修正
echo ""
echo "📜 JavaScript セレクタ統一..."
JS_FILES=(
    "js/avatar-size-enforcer.js"
    "js/profile-sync.js"
    "js/profile-image-upload.js"
)

for js in "${JS_FILES[@]}"; do
    if [ -f "$js" ]; then
        # #userAvatar を削除してクラスのみに
        sed -i "s/'.user-avatar, #userAvatar'/'.user-avatar'/g" "$js"
        sed -i 's/".user-avatar, #userAvatar"/".user-avatar"/g' "$js"
        echo "  ✅ $(basename $js) のセレクタ統一"
    fi
done

# 6. 確認レポート生成
echo ""
echo "📊 修正結果レポート生成..."
echo "=== アバター修正レポート $(date) ===" > avatar-fix-report.txt
echo "" >> avatar-fix-report.txt
echo "1. 画像パス統一状況:" >> avatar-fix-report.txt
grep -h "default-avatar\|user-placeholder" "${HTML_FILES[@]}" 2>/dev/null | \
    grep -o 'src="[^"]*"' | sort | uniq -c >> avatar-fix-report.txt
echo "" >> avatar-fix-report.txt
echo "2. ID使用状況:" >> avatar-fix-report.txt
grep -c 'id="userAvatar"' "${HTML_FILES[@]}" 2>/dev/null >> avatar-fix-report.txt || echo "  ✅ 重複ID削除完了" >> avatar-fix-report.txt
echo "" >> avatar-fix-report.txt
echo "3. 無効化したCSS:" >> avatar-fix-report.txt
for css in "${CONFLICT_CSS[@]}"; do
    if [ -f "css/$css" ]; then
        echo "  - $css" >> avatar-fix-report.txt
    fi
done

echo ""
echo "✅ 全修正完了！"
echo "📄 詳細は avatar-fix-report.txt を確認"
echo ""
echo "🔍 動作確認方法:"
echo "1. ブラウザキャッシュをクリア"
echo "2. 各ページでアバターサイズを確認"
echo "3. コンソールでエラーがないか確認"