#!/bin/bash

echo "Supabase初期化の重複を解消中..."

# HTMLファイルのリスト
HTML_FILES=(
    "login.html"
    "index.html"
    "referral.html"
    "dashboard.html"
    "profile.html"
    "messages.html"
    "matching.html"
    "members.html"
    "events.html"
    "settings.html"
    "notifications.html"
    "register.html"
    "line-callback.html"
    "forgot-password.html"
)

# 各HTMLファイルを更新
for file in "${HTML_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "更新中: $file"
        
        # 古い3つのファイルを削除
        sed -i '/<script src="js\/supabase-client\.js/d' "$file"
        sed -i '/<script src="js\/auth-supabase\.js/d' "$file"
        sed -i '/<script src="js\/supabase-init-wait\.js/d' "$file"
        
        # 新しい統一ファイルを追加（まだない場合）
        if ! grep -q "supabase-unified.js" "$file"; then
            # </body>タグの前に挿入
            sed -i '/<\/body>/i\    <script src="js/supabase-unified.js?v=1.0"></script>' "$file"
        fi
    fi
done

echo "完了！"