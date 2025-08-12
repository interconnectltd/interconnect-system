# Ver.010 更新ログ

## 2024年8月12日 更新内容

### 修正ファイル
1. **events.html**
   - キャッシュバスティング更新（v=20250812 → v=20250812.2）
   - event-modal.js
   - events-supabase.js
   - dashboard.js
   - calendar-integration.js

2. **sql/fix-event-participants-406.sql**（更新）
   - event_participantsテーブルの406エラー完全修正
   - 既存ポリシーをすべて削除して再作成
   - authenticated/anonロール両方に適切な権限付与
   - auth.uid()関数への実行権限付与
   - 権限確認クエリ追加

### 解決した問題
- ✅ window.supabase.from is not a function（キャッシュ問題）
- ✅ 406 Not Acceptable（event_participants権限問題 - 完全修正版）

### Ver.010への同期
- ✅ events.html
- ✅ fix-event-participants-406.sql（更新版）

## 実行が必要なSQL（実行順序）
1. fix-event-items-rls.sql
2. insert-simple-event.sql
3. fix-event-participants-406.sql（更新版 - 必須）
4. verify-event-participants.sql（動作確認用 - オプション）

Supabase DashboardのSQL Editorで上記の順番で実行してください。
特に`fix-event-participants-406.sql`は406エラーを完全に解決するための重要な更新です。

## 動作確認結果
- ✅ event_participantsテーブルに7件のデータが正常に保存
- ✅ 406エラーが解決され、データアクセスが正常化
- ✅ RLSポリシーが適切に設定され、権限管理が機能