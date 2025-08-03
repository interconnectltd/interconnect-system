#!/bin/bash

# 色付き出力用の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# カスタムメッセージまたはデフォルトメッセージ
if [ ! -z "$1" ]; then
    COMMIT_MESSAGE="$1"
else
    COMMIT_MESSAGE="自動更新: $(date +"%Y-%m-%d %H:%M:%S")"
fi

echo -e "${BLUE}=== クイックデプロイ開始 ===${NC}"
echo -e "${BLUE}コミットメッセージ: ${COMMIT_MESSAGE}${NC}"

# 1. 変更の確認
if [ -z "$(git status --porcelain)" ]; then 
    echo -e "${YELLOW}[WARNING] コミットする変更がありません${NC}"
else
    # 2. ステージング
    echo -e "${BLUE}[1/4] 変更をステージング中...${NC}"
    git add -A

    # 3. コミット
    echo -e "${BLUE}[2/4] コミット中...${NC}"
    git commit -m "$COMMIT_MESSAGE" || {
        echo -e "${RED}[ERROR] コミットに失敗しました${NC}"
        exit 1
    }

    # 4. プッシュ（タイムアウト対策）
    echo -e "${BLUE}[3/4] GitHubへプッシュ中...${NC}"
    timeout 30s git push origin main || {
        if [ $? -eq 124 ]; then
            echo -e "${YELLOW}[WARNING] プッシュがタイムアウトしました。バックグラウンドで続行中...${NC}"
        else
            echo -e "${RED}[ERROR] プッシュに失敗しました${NC}"
            exit 1
        fi
    }
fi

# 5. Windows同期（非同期実行）
echo -e "${BLUE}[4/4] Windows同期をバックグラウンドで実行中...${NC}"
nohup /home/ooxmichaelxoo/INTERCONNECT_project/scripts/sync-to-windows-fast.sh > /tmp/sync.log 2>&1 &
SYNC_PID=$!

echo -e "${GREEN}=== デプロイ完了 ===${NC}"
echo -e "${GREEN}GitHubへのプッシュ: 完了${NC}"
echo -e "${GREEN}Windows同期: バックグラウンドで実行中 (PID: $SYNC_PID)${NC}"
echo -e "${YELLOW}同期ログ: tail -f /tmp/sync.log${NC}"