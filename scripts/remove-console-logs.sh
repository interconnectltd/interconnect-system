#!/bin/bash

# console.logをコメントアウトするスクリプト
# 既にコメントアウトされているものはスキップ

echo "Removing active console.log statements..."

# JSファイルを処理
find /home/ooxmichaelxoo/INTERCONNECT_project/js -name "*.js" -type f | while read file; do
    # 一時ファイルを作成
    temp_file="${file}.tmp"
    
    # console.logをコメントアウト（既にコメントアウトされているものは除く）
    sed -E 's/^([[:space:]]*)console\.log/\1\/\/ console.log/g' "$file" | \
    sed -E 's/([^\/]|^)([[:space:]]+)console\.log/\1\2\/\/ console.log/g' > "$temp_file"
    
    # ファイルが変更された場合のみ置き換え
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        echo "Updated: $file"
    else
        rm "$temp_file"
    fi
done

echo "Console.log removal complete!"