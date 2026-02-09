#!/bin/bash

# Netlify環境変数設定スクリプト
# 使用方法: ./setup-netlify-env.sh

echo "================================"
echo "Netlify環境変数設定スクリプト"
echo "================================"
echo ""
echo "このスクリプトはNetlify CLIを使用して環境変数を設定します。"
echo "事前にNetlify CLIをインストールし、ログインしてください："
echo "  npm install -g netlify-cli"
echo "  netlify login"
echo ""

# Netlify CLIがインストールされているか確認
if ! command -v netlify &> /dev/null; then
    echo "エラー: Netlify CLIがインストールされていません。"
    echo "以下のコマンドでインストールしてください："
    echo "  npm install -g netlify-cli"
    exit 1
fi

# サイトがリンクされているか確認
if ! netlify status &> /dev/null; then
    echo "エラー: Netlifyサイトがリンクされていません。"
    echo "以下のコマンドでサイトをリンクしてください："
    echo "  netlify link"
    exit 1
fi

echo "現在のサイト情報："
netlify status

echo ""
echo "環境変数を設定します..."

# 必要な環境変数の入力を求める
# ハードコードされた値を使用
SUPABASE_URL="https://whyoqhhzwtlxprhizmor.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeW9xaGh6d3RseHByaGl6bW9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTUyMzI3NSwiZXhwIjoyMDY3MDk5Mjc1fQ.mYUFuZ8H2X8w2UOSwV4qeQ5C7e0skRgeV38hJ7ognSE"
LINE_CHANNEL_ID="2007688781"
LINE_CHANNEL_SECRET="d2837edd8c998278b217057d5a74d427"

# サイトURLを取得
SITE_URL=$(netlify status --json | grep -o '"url":"[^"]*' | grep -o '[^"]*$')
echo "サイトURL: $SITE_URL"

# 環境変数を設定
echo ""
echo "環境変数を設定中..."

netlify env:set SUPABASE_URL "$SUPABASE_URL"
netlify env:set SUPABASE_SERVICE_KEY "$SUPABASE_SERVICE_KEY"
netlify env:set LINE_CHANNEL_ID "$LINE_CHANNEL_ID"
netlify env:set LINE_CHANNEL_SECRET "$LINE_CHANNEL_SECRET"
netlify env:set URL "$SITE_URL"
netlify env:set ALLOWED_ORIGINS "$SITE_URL"
netlify env:set ALLOWED_DOMAINS "$(echo $SITE_URL | sed 's|https://||g'),localhost"

echo ""
echo "環境変数の設定が完了しました！"
echo ""
echo "設定された環境変数を確認："
netlify env:list

echo ""
echo "次のステップ："
echo "1. Supabaseダッシュボードで以下を設定："
echo "   - Authentication > URL Configuration でサイトURLを追加"
echo "   - SQL Editorで supabase/seed.sql を実行"
echo ""
echo "2. LINE Developersコンソールで以下を設定："
echo "   - Callback URL: ${SITE_URL}/line-callback.html"
echo ""
echo "3. デプロイを実行："
echo "   git push"
echo ""
echo "完了！"