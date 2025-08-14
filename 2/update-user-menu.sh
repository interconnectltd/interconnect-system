#!/bin/bash

# ユーザーメニュー修正をすべてのページに適用

echo "ユーザーメニューの修正を適用中..."

# 対象ファイルリスト
files=(
    "settings.html"
    "dashboard.html"
    "profile.html"
    "notifications.html"
    "messages.html"
    "members.html"
    "invite.html"
    "events.html"
    "billing.html"
    "matching.html"
    "admin.html"
)

# 各ファイルに修正を適用
for file in "${files[@]}"; do
    echo "処理中: $file"
    
    # user-menu-fix.cssを追加（まだ追加されていない場合）
    if ! grep -q "user-menu-fix.css" "$file"; then
        # </head>タグの前に追加
        sed -i '/<\/head>/i\    <link rel="stylesheet" href="css/user-menu-fix.css">' "$file"
    fi
    
    # user-menu-enhanced.jsを追加（まだ追加されていない場合）
    if ! grep -q "user-menu-enhanced.js" "$file"; then
        # </body>タグの前に追加
        sed -i '/<\/body>/i\    <script src="js/user-menu-enhanced.js"></script>' "$file"
    fi
done

echo "完了！"