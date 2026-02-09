#!/bin/bash

echo "📝 統一スクリプトをHTMLファイルに追加"
echo "======================================="
echo ""

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

# notification-system-unified.jsを追加
echo "🔔 統一通知システムを追加中..."
for file in "${HTML_FILES[@]}"; do
    if [ -f "$file" ]; then
        # notification-system-unified.jsがまだ追加されていない場合のみ追加
        if ! grep -q "notification-system-unified.js" "$file"; then
            # supabase-unified.jsの前に追加（早期に読み込む必要があるため）
            sed -i '/supabase-unified\.js/i\    <!-- 統一通知システム -->\n    <script src="js/notification-system-unified.js"></script>' "$file"
            echo "  ✅ $file に追加完了"
        else
            echo "  ⏭️  $file は既に追加済み"
        fi
    fi
done

echo ""
echo "🗑️ 重複実装の削除準備..."
echo ""

# 重複実装を持つファイルリスト
DUPLICATE_FILES=(
    "js/register-nextstep-final-fix.js"
    "js/settings-navigation.js"
    "js/notifications-unified.js"
    "js/event-registration.js"
    "js/admin-site-settings.js"
    "js/settings.js"
    "js/supabase-unified.js"
    "js/referral-unified.js"
    "js/settings-improved.js"
    "js/register-with-invite.js"
    "js/auth-enhanced.js"
    "js/profile-image-upload.js"
    "js/advanced-search.js"
    "js/notifications-realtime-unified.js"
    "js/super-admin.js"
    "js/matching-unified.js"
)

echo "以下のファイルから重複実装を削除する必要があります:"
for file in "${DUPLICATE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  - $file"
    fi
done

echo ""
echo "✅ 統一スクリプト追加完了"
echo ""
echo "⚠️  次のステップ:"
echo "1. 各ページで通知機能の動作確認"
echo "2. showToast(), showError(), showSuccess()が正常動作するか確認"
echo "3. alert()が自動的にトースト通知に変換されるか確認"