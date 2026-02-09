#!/bin/bash

# 自動デプロイスクリプト
# GitHubにプッシュしてNetlifyに自動デプロイ

echo "================================"
echo "INTERCONNECT 自動デプロイ"
echo "================================"
echo ""

# Gitリポジトリが初期化されているか確認
if [ ! -d .git ]; then
    echo "Gitリポジトリを初期化します..."
    git init
    git branch -M main
fi

# リモートリポジトリが設定されているか確認
if ! git remote | grep -q origin; then
    echo ""
    echo "GitHubリポジトリのURLを入力してください："
    echo "例: https://github.com/yourusername/INTERCONNECT.git"
    read -p "GitHub URL: " GITHUB_URL
    git remote add origin "$GITHUB_URL"
fi

# 現在の状態を確認
echo ""
echo "現在の変更状況："
git status

# 変更をステージング
echo ""
echo "すべての変更をステージングします..."
git add -A

# コミットメッセージを入力
echo ""
echo "コミットメッセージを入力してください："
read -p "メッセージ: " COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update INTERCONNECT project"
fi

# コミット
git commit -m "$COMMIT_MSG"

# メインブランチにプッシュ
echo ""
echo "GitHubにプッシュしています..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ デプロイが開始されました！"
    echo ""
    echo "Netlifyのビルド状況を確認："
    echo "  netlify watch"
    echo ""
    echo "または Netlifyダッシュボードで確認してください。"
    echo ""
    
    # Netlify CLIがインストールされている場合はビルド状況を表示
    if command -v netlify &> /dev/null; then
        echo "ビルド状況を監視します..."
        netlify watch
    fi
else
    echo ""
    echo "❌ プッシュに失敗しました。"
    echo ""
    echo "以下を確認してください："
    echo "1. GitHubにログインしているか"
    echo "2. リポジトリへのアクセス権限があるか"
    echo "3. リモートURLが正しいか"
    echo ""
    echo "手動でプッシュする場合："
    echo "  git push origin main"
fi