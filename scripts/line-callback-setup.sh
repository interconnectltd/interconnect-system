#!/bin/bash

echo "========================================="
echo "LINE Developers コールバックURL設定ガイド"
echo "========================================="
echo ""
echo "LINE Developersの設定は手動で行う必要があります。"
echo ""
echo "設定手順："
echo ""
echo "1. LINE Developersにアクセス"
echo "   https://developers.line.biz/console/"
echo ""
echo "2. Channel ID: 2007688616 のチャネルを選択"
echo ""
echo "3. 「LINE Login設定」タブをクリック"
echo ""
echo "4. 「コールバックURL」セクションで以下のURLを追加："
echo ""
echo "   ✅ https://interconnect-auto-test.netlify.app/line-callback.html"
echo "   ✅ http://localhost:8888/line-callback.html"
echo ""
echo "5. 「更新」ボタンをクリックして保存"
echo ""
echo "========================================="
echo ""
echo "注意事項："
echo "- URLは正確にコピー＆ペーストしてください"
echo "- httpsとhttpの違いに注意してください"
echo "- localhostのポート番号は8888です"
echo ""
echo "LINE Developersコンソールを開きますか？ (y/n)"
read -r response

if [[ "$response" == "y" || "$response" == "Y" ]]; then
    echo ""
    echo "ブラウザでLINE Developersコンソールを開いています..."
    
    # OSに応じて適切なコマンドを使用
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # WSL環境の場合
        if grep -q Microsoft /proc/version; then
            cmd.exe /c start https://developers.line.biz/console/
        else
            xdg-open https://developers.line.biz/console/
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        open https://developers.line.biz/console/
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        start https://developers.line.biz/console/
    fi
    
    echo ""
    echo "上記の手順に従って設定を完了してください。"
fi

echo ""
echo "設定が完了したら、以下のコマンドでテストできます："
echo ""
echo "  1. ローカルでテスト: ./test-local.sh"
echo "  2. 本番でテスト: ブラウザで https://interconnect-auto-test.netlify.app にアクセス"
echo ""