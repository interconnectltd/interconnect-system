#!/bin/bash

echo "================================================"
echo "Supabase Service Key 取得・設定ガイド"
echo "================================================"
echo ""
echo "Supabase Service Keyの設定手順："
echo ""
echo "1. Supabaseダッシュボードにアクセス"
echo "   https://app.supabase.com"
echo ""
echo "2. プロジェクト 'whyoqhhzwtlxprhizmor' を選択"
echo ""
echo "3. 左側メニューから Settings → API をクリック"
echo ""
echo "4. 'Project API keys' セクションで"
echo "   'service_role' のキーをコピー（秘密鍵）"
echo "   ※ 'anon' ではなく 'service_role' です"
echo ""
echo "5. コピーしたキーを以下のコマンドで設定："
echo ""
echo "   netlify env:set SUPABASE_SERVICE_KEY \"コピーしたキー\""
echo ""
echo "================================================"
echo ""
echo "データベース初期化手順："
echo ""
echo "1. Supabaseダッシュボードの SQL Editor を開く"
echo ""
echo "2. supabase-init.sql の内容を実行"
echo "   ファイル: $(pwd)/supabase-init.sql"
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
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        start https://app.supabase.com/project/whyoqhhzwtlxprhizmor/settings/api
    fi
    
    echo ""
    echo "上記の手順に従ってService Keyを取得してください。"
    echo ""
    echo "Service Keyを取得したら、以下のように設定してください："
    echo ""
    echo "netlify env:set SUPABASE_SERVICE_KEY \"取得したキー\""
fi

echo ""
echo "SQLファイルの内容を表示しますか？ (y/n)"
read -r sql_response

if [[ "$sql_response" == "y" || "$sql_response" == "Y" ]]; then
    echo ""
    echo "=== supabase-init.sql の内容 ==="
    cat supabase-init.sql
    echo ""
    echo "=== 以上 ==="
    echo ""
    echo "このSQLをSupabaseのSQL Editorで実行してください。"
fi

echo ""
echo "設定完了後の確認方法："
echo "  netlify env:list"
echo ""