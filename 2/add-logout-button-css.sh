#!/bin/bash

# ログアウトボタンCSSを全HTMLファイルに追加

echo "ログアウトボタンCSSを追加しています..."

# 対象ファイル
files=(
    "referral.html"
    "matching.html"
    "events.html"
    "members.html"
    "profile.html"
    "notifications.html"
    "settings.html"
    "messages.html"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        # dashboard.cssの後にlogout-button-fix.cssを追加
        if grep -q "dashboard.css" "$file"; then
            # 既にlogout-button-fix.cssが存在しない場合のみ追加
            if ! grep -q "logout-button-fix.css" "$file"; then
                sed -i '/dashboard.css/a\    <!-- ログアウトボタンUI修正 -->\n    <link rel="stylesheet" href="css/logout-button-fix.css">' "$file"
                echo "追加: $file"
            else
                echo "スキップ: $file (既に存在)"
            fi
        fi
    fi
done

echo "完了しました。"