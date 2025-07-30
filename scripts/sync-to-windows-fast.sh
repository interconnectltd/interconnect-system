#!/bin/bash
# Windows側のVer.008フォルダに高速同期するスクリプト

# 同期先のWindowsパス
WINDOWS_PATH="/mnt/c/Users/ooxmi/Downloads/Ver.008【コード】INTERCONNECT"

# 同期元
SOURCE_PATH="/home/ooxmichaelxoo/INTERCONNECT_project"

echo "[INFO] Windows側への同期を開始します..."
echo "[INFO] 同期元: $SOURCE_PATH"
echo "[INFO] 同期先: $WINDOWS_PATH"

# ディレクトリがなければ作成
mkdir -p "$WINDOWS_PATH"

# 必要なファイルのみをコピー（不要ファイルを除外）
cp -r "$SOURCE_PATH"/{*.html,css,js,assets,sql} "$WINDOWS_PATH/" 2>/dev/null

# 不要なファイルを削除
find "$WINDOWS_PATH" -name "*.log" -delete 2>/dev/null
find "$WINDOWS_PATH" -name "*.tmp" -delete 2>/dev/null
find "$WINDOWS_PATH" -name "*.bak" -delete 2>/dev/null
find "$WINDOWS_PATH" -name ".DS_Store" -delete 2>/dev/null
find "$WINDOWS_PATH" -name "Thumbs.db" -delete 2>/dev/null

# テスト関連ファイルを削除
find "$WINDOWS_PATH/js" -name "*.test.js" -delete 2>/dev/null
find "$WINDOWS_PATH/js" -name "*.spec.js" -delete 2>/dev/null
find "$WINDOWS_PATH/js" -name "test-*.js" -delete 2>/dev/null

# 結果を表示
echo "[INFO] 同期完了"
echo "[INFO] ファイル数: $(find "$WINDOWS_PATH" -type f | wc -l)"
echo "[INFO] ディレクトリ数: $(find "$WINDOWS_PATH" -type d | wc -l)"