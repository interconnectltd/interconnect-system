#!/bin/bash

# 色付き出力用の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[INFO] 自動コミット・プッシュを開始します...${NC}"

# 現在の日時を取得
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MESSAGE="自動更新: ${TIMESTAMP}"

# カスタムコミットメッセージが指定されている場合は使用
if [ ! -z "$1" ]; then
    COMMIT_MESSAGE="$1"
fi

# 変更があるかチェック
if [ -z "$(git status --porcelain)" ]; then 
    echo -e "${YELLOW}[WARNING] コミットする変更がありません${NC}"
    exit 0
fi

# すべての変更をステージング
echo -e "${BLUE}[INFO] 変更をステージング中...${NC}"
git add -A

# 変更内容を表示
echo -e "${BLUE}[INFO] 変更内容:${NC}"
git status --short

# コミット
echo -e "${BLUE}[INFO] コミット中...${NC}"
git commit -m "$COMMIT_MESSAGE" || {
    echo -e "${RED}[ERROR] コミットに失敗しました${NC}"
    exit 1
}

# プッシュ前にリモートの最新状態を取得
echo -e "${BLUE}[INFO] リモートの最新状態を取得中...${NC}"
git fetch origin main

# リモートに変更がある場合はマージ
if [ $(git rev-list HEAD..origin/main --count) -gt 0 ]; then
    echo -e "${YELLOW}[WARNING] リモートに新しい変更があります。マージします...${NC}"
    git merge origin/main --no-edit || {
        echo -e "${RED}[ERROR] マージに失敗しました。手動で解決してください${NC}"
        exit 1
    }
fi

# プッシュ
echo -e "${BLUE}[INFO] GitHubへプッシュ中...${NC}"
git push origin main || {
    echo -e "${RED}[ERROR] プッシュに失敗しました${NC}"
    echo -e "${YELLOW}[INFO] 認証情報を確認してください${NC}"
    exit 1
}

echo -e "${GREEN}[SUCCESS] 自動コミット・プッシュが完了しました！${NC}"
echo -e "${GREEN}コミット: $COMMIT_MESSAGE${NC}"

# Windows側への同期も実行
echo -e "${BLUE}[INFO] Windows側への同期を開始します...${NC}"
/home/ooxmichaelxoo/INTERCONNECT_project/scripts/sync-to-windows-fast.sh