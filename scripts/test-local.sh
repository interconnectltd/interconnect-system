#!/bin/bash

# ローカルテストスクリプト
# Netlify Devを使用してローカルでFunctionsをテスト

echo "================================"
echo "ローカルテスト環境セットアップ"
echo "================================"
echo ""

# .envファイルが存在しない場合は作成
if [ ! -f .env ]; then
    echo ".envファイルが見つかりません。作成します..."
    cp .env.example .env
    echo ""
    echo ".envファイルを作成しました。"
    echo "必要な環境変数を設定してください："
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_KEY" 
    echo "  - LINE_CHANNEL_ID"
    echo "  - LINE_CHANNEL_SECRET"
    echo ""
    echo "設定後、再度このスクリプトを実行してください。"
    exit 1
fi

# Netlify CLIがインストールされているか確認
if ! command -v netlify &> /dev/null; then
    echo "Netlify CLIをインストール中..."
    npm install -g netlify-cli
fi

# Functions用の依存関係をインストール
echo "Functions用の依存関係をインストール中..."
cd netlify/functions
npm install
cd ../..

echo ""
echo "ローカル開発サーバーを起動します..."
echo "URL: http://localhost:8888"
echo ""
echo "テスト方法:"
echo "1. http://localhost:8888 にアクセス"
echo "2. ログインページで「LINEでログイン」をクリック"
echo "3. Functions APIは http://localhost:8888/.netlify/functions/line-auth で動作"
echo ""
echo "Ctrl+C で終了"
echo ""

# Netlify Devを起動
netlify dev