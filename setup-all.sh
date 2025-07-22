#!/bin/bash

echo "========================================"
echo "INTERCONNECT 完全セットアップスクリプト"
echo "========================================"
echo ""

# Netlifyログイン確認
if ! netlify status &> /dev/null; then
    echo "❌ Netlifyにログインしていません"
    echo ""
    echo "以下のコマンドを実行してログインしてください："
    echo "  netlify login"
    echo ""
    echo "ログイン後、再度このスクリプトを実行してください。"
    exit 1
fi

echo "✅ Netlifyログイン確認OK"
echo ""

# サイトリンク確認
if ! netlify status | grep -q "Site ID"; then
    echo "📎 Netlifyサイトをリンクします..."
    netlify link
fi

echo "✅ サイトリンク確認OK"
echo ""

# 環境変数設定
echo "🔧 環境変数を設定します..."

# LINE設定
netlify env:set LINE_CHANNEL_ID "2007688616"
netlify env:set LINE_CHANNEL_SECRET "12e4b8c5e7904bb66be6006f8fd741ac"

# Supabase設定
netlify env:set SUPABASE_URL "https://whyoqhhzwtlxprhizmor.supabase.co"
netlify env:set SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeW9xaGh6d3RseHByaGl6bW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjMyNzUsImV4cCI6MjA2NzA5OTI3NX0.HI03HObR6GkTmYh4Adm_DRkUOAssA8P1dhqzCH-mLrw"

# サイトURL設定（interconnect-auto-test用）
SITE_URL="https://interconnect-auto-test.netlify.app"
netlify env:set URL "$SITE_URL"
netlify env:set ALLOWED_ORIGINS "$SITE_URL"
netlify env:set ALLOWED_DOMAINS "interconnect-auto-test.netlify.app,localhost"

echo ""
echo "✅ 環境変数の設定完了"
echo ""

# 設定確認
echo "📋 設定された環境変数："
netlify env:list

echo ""
echo "========================================"
echo "✅ Netlify設定完了！"
echo "========================================"
echo ""
echo "次のステップ："
echo ""
echo "1. Supabase Service Keyの設定（取得が必要）"
echo "   netlify env:set SUPABASE_SERVICE_KEY \"your-service-key\""
echo ""
echo "2. LINE DevelopersでコールバックURLを設定"
echo "   - https://interconnect-auto-test.netlify.app/line-callback.html"
echo ""
echo "3. Supabaseデータベースの初期化"
echo "   - Supabaseダッシュボードで supabase/seed.sql を実行"
echo ""
echo "4. 変更を反映するため再デプロイ"
echo "   netlify deploy --trigger"
echo ""