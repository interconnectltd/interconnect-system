#!/bin/bash

echo "========================================"
echo "LINE設定チェックスクリプト"
echo "========================================"
echo ""
echo "現在の設定："
echo ""
echo "1. JavaScriptファイル内のChannel ID:"
grep -n "LINE_CHANNEL_ID" js/auth-supabase.js | head -1
echo ""
echo "2. Netlify環境変数のChannel ID:"
netlify env:get LINE_CHANNEL_ID 2>/dev/null || echo "環境変数が設定されていません"
echo ""
echo "========================================"
echo "LINE Developersで確認すべき項目："
echo "========================================"
echo ""
echo "1. LINE Developersにログイン"
echo "   https://developers.line.biz/console/"
echo ""
echo "2. 使用するチャネルを選択"
echo ""
echo "3. 「チャネル基本設定」で以下を確認："
echo "   - チャネルID（Channel ID）"
echo "   - チャネルシークレット（Channel secret）"
echo ""
echo "4. 「LINE Login設定」タブで確認："
echo "   - LINE Loginが有効になっているか"
echo "   - コールバックURLが設定されているか"
echo ""
echo "========================================"
echo "正しいChannel IDを確認したら："
echo "========================================"
echo ""
echo "1. JavaScriptファイルを更新:"
echo "   編集: js/auth-supabase.js の LINE_CHANNEL_ID"
echo ""
echo "2. Netlify環境変数を更新:"
echo "   netlify env:set LINE_CHANNEL_ID \"正しいID\""
echo ""
echo "3. 再デプロイ:"
echo "   netlify deploy --trigger"
echo ""
echo "LINE Developersを開きますか？ (y/n)"
read -r response

if [[ "$response" == "y" || "$response" == "Y" ]]; then
    echo ""
    echo "ブラウザでLINE Developersを開いています..."
    
    # WSL環境の場合
    if grep -q Microsoft /proc/version; then
        cmd.exe /c start https://developers.line.biz/console/
    else
        xdg-open https://developers.line.biz/console/ 2>/dev/null || echo "ブラウザを開けませんでした"
    fi
fi