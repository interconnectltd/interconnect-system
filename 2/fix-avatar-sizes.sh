#!/bin/bash

# アバターサイズ統一化スクリプト
echo "🔧 アバターサイズ統一化を開始..."

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

# 統一CSSを各HTMLに追加
for file in "${HTML_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📝 $file を処理中..."
        
        # avatar-size-unified.cssがまだ追加されていない場合のみ追加
        if ! grep -q "avatar-size-unified.css" "$file"; then
            # z-index-priority.cssの後に追加
            sed -i '/z-index-priority\.css/a\    <!-- アバターサイズ統一 -->\n    <link rel="stylesheet" href="css/avatar-size-unified.css">' "$file"
            echo "  ✅ CSS追加完了"
        else
            echo "  ⏭️  既に追加済み"
        fi
        
        # avatar-size-enforcer.jsがまだ追加されていない場合のみ追加
        if ! grep -q "avatar-size-enforcer.js" "$file"; then
            # </body>タグの前に追加
            sed -i '/<\/body>/i\    <!-- アバターサイズ強制適用 -->\n    <script src="js/avatar-size-enforcer.js"></script>' "$file"
            echo "  ✅ JS追加完了"
        else
            echo "  ⏭️  JS既に追加済み"
        fi
    else
        echo "⚠️  $file が見つかりません"
    fi
done

echo ""
echo "🎯 競合CSSファイルのリスト（要確認）:"
echo "  - css/header-user-menu-redesign.css (36px)"
echo "  - css/presentation.css (60px)"
echo "  - css/user-dropdown-unified.css (32px)"
echo "  - css/advanced-search.css (80px)"
echo ""
echo "✅ アバターサイズ統一化完了！"
echo ""
echo "📋 次のステップ:"
echo "1. ブラウザでキャッシュをクリアして確認"
echo "2. 開発者ツールのコンソールで AvatarEnforcer.detectConflicts() を実行"
echo "3. 問題があれば AvatarEnforcer.enforce() で強制適用"