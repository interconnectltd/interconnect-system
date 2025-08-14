#!/bin/bash

echo "================================================"
echo "Supabase Service Key 取得ガイド"
echo "================================================"
echo ""
echo "⚠️  現在、SUPABASE_SERVICE_KEYが未設定のため"
echo "   LINEログインの最後の処理でエラーが発生しています。"
echo ""
echo "📍 プロジェクト情報："
echo "   URL: https://whyoqhhzwtlxprhizmor.supabase.co"
echo "   Anon Key: 設定済み（公開用）"
echo "   Service Key: 未設定（要取得）"
echo ""
echo "================================================"
echo "取得手順："
echo "================================================"
echo ""
echo "1. Supabaseダッシュボードを開く"
echo "   https://app.supabase.com/project/whyoqhhzwtlxprhizmor/settings/api"
echo ""
echo "2. 「Project API keys」セクションで"
echo "   service_role の「Reveal」ボタンをクリック"
echo ""
echo "3. 表示されたキーをコピー"
echo ""
echo "4. 以下のコマンドで設定："
echo ""
echo "   netlify env:set SUPABASE_SERVICE_KEY \"取得したキー\""
echo ""
echo "5. 再デプロイ："
echo ""
echo "   netlify deploy --trigger"
echo ""
echo "================================================"
echo ""
echo "Supabaseダッシュボードを開きますか？ (y/n)"
read -r response

if [[ "$response" == "y" || "$response" == "Y" ]]; then
    echo ""
    echo "ブラウザでSupabaseダッシュボードを開いています..."
    
    # OSに応じて適切なコマンドを使用
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # WSL環境の場合
        if grep -q Microsoft /proc/version; then
            cmd.exe /c start https://app.supabase.com/project/whyoqhhzwtlxprhizmor/settings/api
        else
            xdg-open https://app.supabase.com/project/whyoqhhzwtlxprhizmor/settings/api
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        open https://app.supabase.com/project/whyoqhhzwtlxprhizmor/settings/api
    fi
fi

echo ""
echo "⚠️  重要な注意事項："
echo "   - service_role キーは秘密情報です"
echo "   - フロントエンドコードには絶対に含めないでください"
echo "   - Netlify環境変数としてのみ使用してください"
echo ""