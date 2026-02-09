# LLMベースマッチング機能のセットアップガイド

## 概要
LLMを使用して議事録を高度に解析し、より精度の高いビジネスマッチングを実現します。

## 実装方法

### 1. ローカル処理（デフォルト）
APIキー不要で、ブラウザ内で高度なパターンマッチングを実行します。

```javascript
// 有効化（matching.htmlに追加）
<script src="js/matching-ai-llm-analyzer.js"></script>
<script src="js/matching-ai-llm-integration.js"></script>

// 設定
localStorage.setItem('useLLMMatching', 'true');
```

### 2. Supabase Edge Functions経由（推奨）
サーバーサイドでLLM APIを安全に実行します。

#### Edge Functionの作成
```bash
supabase functions new analyze-minutes
```

#### analyze-minutes/index.ts
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.1.0'

serve(async (req) => {
    const { prompt } = await req.json()
    
    const openai = new OpenAIApi(new Configuration({
        apiKey: Deno.env.get('OPENAI_API_KEY')
    }))
    
    const completion = await openai.createChatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
    })
    
    return new Response(
        JSON.stringify({ result: completion.data.choices[0].message.content }),
        { headers: { 'Content-Type': 'application/json' } }
    )
})
```

#### 環境変数の設定
```bash
supabase secrets set OPENAI_API_KEY=your-api-key-here
```

#### デプロイ
```bash
supabase functions deploy analyze-minutes
```

### 3. ブラウザ内LLM（将来的なオプション）
WebLLMやONNX Runtimeを使用してブラウザ内でLLMを実行。

```javascript
// 例: WebLLM
import { CreateMLCEngine } from "@mlc-ai/web-llm";

const engine = await CreateMLCEngine("Llama-2-7b-chat-hf-q4f32_1");
const response = await engine.chat.completions.create({
    messages: [{ role: "user", content: prompt }]
});
```

## 機能

### 高度な議事録解析
- ビジネス情報の構造化抽出
- 課題とソリューションのマッピング
- トレンドと業界動向の分析
- 緊急度と優先順位の判定

### インテリジェントマッチング
- 双方向の課題解決可能性分析
- リソースの補完関係評価
- 成長フェーズの適合性判定
- リスクと機会の特定

### 実用的な提案生成
- 具体的なアクションプラン
- 優先度付きの推奨事項
- リスク軽減策の提示
- 協業シナリオの提案

## プライバシーとセキュリティ

1. **ローカル処理優先**: デフォルトではブラウザ内で処理
2. **Edge Functions**: APIキーはサーバー側で管理
3. **データ最小化**: 必要最小限の情報のみ送信
4. **ユーザー制御**: LLM使用はオプトイン方式

## パフォーマンス最適化

1. **キャッシング**: 解析結果を7日間キャッシュ
2. **バッチ処理**: 複数の議事録をまとめて解析
3. **プログレッシブ強化**: LLM不可時は従来の手法にフォールバック
4. **非同期処理**: UIをブロックしない

## 今後の拡張

1. **マルチモーダル対応**: 画像や図表の解析
2. **リアルタイム分析**: 会議中のライブ解析
3. **多言語対応**: 英語・中国語等への対応
4. **業界特化モデル**: 特定業界向けの最適化