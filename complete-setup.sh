#!/bin/bash

echo "=========================================="
echo "INTERCONNECT 完全セットアップスクリプト"
echo "=========================================="
echo ""
echo "このスクリプトは全ての設定を順番に実行します。"
echo ""

# ステップ1: Netlify環境変数の確認
echo "[ステップ 1/4] Netlify環境変数の確認"
echo "-------------------------------------"
netlify env:list | grep -E "(LINE_|SUPABASE_|ALLOWED_)" || echo "環境変数が設定されていません"
echo ""

# ステップ2: LINE Developersの設定
echo "[ステップ 2/4] LINE Developers設定"
echo "-------------------------------------"
echo "LINE DevelopersでコールバックURLを設定する必要があります。"
echo ""
echo "設定ガイドを表示しますか？ (y/n)"
read -r line_response
if [[ "$line_response" == "y" || "$line_response" == "Y" ]]; then
    ./line-callback-setup.sh
fi
echo ""

# ステップ3: Supabase設定
echo "[ステップ 3/4] Supabase設定"
echo "-------------------------------------"
echo "Supabase Service Keyの取得とデータベース初期化が必要です。"
echo ""
echo "設定ガイドを表示しますか？ (y/n)"
read -r supabase_response
if [[ "$supabase_response" == "y" || "$supabase_response" == "Y" ]]; then
    ./supabase-setup-guide.sh
fi
echo ""

# ステップ4: デプロイ状態の確認
echo "[ステップ 4/4] デプロイ状態の確認"
echo "-------------------------------------"
echo "最新のデプロイ状態を確認しています..."
netlify status || echo "サイトがリンクされていません"
echo ""

# 完了メッセージ
echo "=========================================="
echo "セットアップ状態の確認"
echo "=========================================="
echo ""
echo "✅ 完了済み："
echo "  - Netlify CLI ログイン"
echo "  - サイトリンク (interconnect-auto-test)"
echo "  - 基本的な環境変数設定"
echo "  - 再デプロイ実行"
echo ""
echo "⚠️  手動設定が必要："
echo "  - LINE Developers コールバックURL"
echo "  - Supabase Service Key"
echo "  - Supabaseデータベース初期化"
echo ""
echo "📝 次のアクション："
echo "  1. LINE Developersでコールバックを設定"
echo "  2. Supabase Service Keyを取得して設定"
echo "  3. supabase-init.sql を実行"
echo "  4. netlify deploy --trigger で再デプロイ"
echo ""
echo "サイトURL: https://interconnect-auto-test.netlify.app"
echo ""