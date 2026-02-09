#!/bin/bash

echo "📝 console.logを完全にコメントアウト中..."
echo "================================"

cd /home/ooxmichaelxoo/INTERCONNECT_project

# console.logがあるファイルを検索して処理
for file in $(find js -name "*.js" -type f); do
    # console.logを含むか確認
    if grep -q "^[^/]*console\.log" "$file"; then
        echo "Processing: $file"
        # sedで console.log を // console.log に置換
        sed -i 's/^\([[:space:]]*\)console\.log/\1\/\/ console.log/g' "$file"
    fi
done

# 結果確認
echo ""
echo "=== 結果 ==="
REMAINING=$(grep -r "^[^/]*console\.log" js --include="*.js" | wc -l)
echo "残りのconsole.log: $REMAINING"

if [ "$REMAINING" -eq 0 ]; then
    echo "✅ すべてのconsole.logをコメントアウトしました！"
else
    echo "⚠️ まだ $REMAINING 個のconsole.logが残っています"
fi