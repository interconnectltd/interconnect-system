# INTERCONNECT カレンダー・チャット・Agent A 統合アーキテクチャ設計書

> 包括的カレンダー同期 + チャット会議検知 + Agent A自動追従
> 最終更新: 2026-04-27
> 実装状態: Phase 1-4 コア実装完了（未コミット・未デプロイ・未マイグレーション）
> 参照: ARCHITECTURE_V4_UNIFIED.md / SCORING_V2_ARCHITECTURE.md

---

## 0. アーキテクチャ概観

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         全体フロー                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                 │
│  │ Google Cal   │   │  Outlook     │   │ ICS URL      │                 │
│  │ (OAuth API)  │   │ (Graph API)  │   │ (ポーリング)  │                 │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                 │
│         │                  │                  │                          │
│         ▼                  ▼                  ▼                          │
│  ┌──────────────────────────────────────────────────┐                   │
│  │        CalendarProvider 抽象化レイヤー             │                   │
│  │   normalize → calendar_events テーブルに統合格納   │                   │
│  └────────────────────────┬─────────────────────────┘                   │
│                           │                                              │
│         ┌─────────────────┼─────────────────┐                           │
│         ▼                 ▼                 ▼                           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐                   │
│  │ 空き時間照合  │  │  日程提案    │  │ Agent A      │                   │
│  │ availability │  │  候補3件自動 │  │ 録音対象検知  │                   │
│  │ API          │  │  生成        │  │              │                   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘                   │
│         │                │                │                              │
│         ▼                ▼                ▼                              │
│  ┌──────────────────────────────────────────────────┐                   │
│  │                  チャット機能                      │                   │
│  │  ├─ 日程調整カード（空き時間から候補提示）          │                   │
│  │  ├─ 会議意図検知（正規表現 + Haiku判定）           │                   │
│  │  └─ 確認カード → 会議自動作成                      │                   │
│  └────────────────────────┬─────────────────────────┘                   │
│                           │                                              │
│                           ▼                                              │
│  ┌──────────────────────────────────────────────────┐                   │
│  │                  Agent A                          │                   │
│  │  ├─ Zoom/Meet 会議リンク自動生成                   │                   │
│  │  ├─ 会議開始検知 → 録音Bot参加                     │                   │
│  │  ├─ Deepgram 文字起こし（話者分離付き）            │                   │
│  │  └─ Opus 4.6 構造化分析 → スコア更新               │                   │
│  └──────────────────────────────────────────────────┘                   │
│                                                                          │
│  ┌──────────────────────────────────────────────────┐                   │
│  │              手動空き時間（フォールバック）          │                   │
│  │  ├─ 週間テンプレート（初回設定のみ）               │                   │
│  │  ├─ 除外日登録                                    │                   │
│  │  └─ カレンダー未連携でも日程調整可能               │                   │
│  └──────────────────────────────────────────────────┘                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 1. カレンダー同期: 3層カバー戦略

### 1.1 設計思想

**問題**: Google Calendar API のみでは、Outlook/Apple/その他のカレンダーユーザーに対応できない。
**解決**: 3層構成で100%のユーザーをカバーする。

| 層 | 方式 | カバー対象 | カバー率 | リアルタイム性 | ユーザー負担 |
|---|---|---|---|---|---|
| 第1層 | 個別API連携 | Google Calendar, Outlook | 85-90% | 高（差分同期） | 低（OAuthボタン） |
| 第2層 | ICS URL購読 | Apple, Yahoo, サイボウズ, Garoon等 | +5-10% | 中（15分ポーリング） | 中（URLコピペ） |
| 第3層 | 手動空き時間 | 全ユーザー（フォールバック） | +残り全て | ユーザー依存 | 中（初回設定のみ） |

### 1.2 CalendarProvider 抽象化レイヤー

```
src/lib/calendar/
  types.ts              ← 共通インターフェース定義
  registry.ts           ← プロバイダー登録・取得
  service.ts            ← CalendarService（統一API）
  crypto.ts             ← AES-256-GCM トークン暗号化（既存google.tsから分離）
  providers/
    google.ts           ← Google Calendar API 実装（既存を移行）
    microsoft.ts        ← Microsoft Graph API 実装
    ics-feed.ts         ← ICS URL購読 実装
```

#### コアインターフェース

```typescript
// src/lib/calendar/types.ts

export type ProviderType = "google" | "microsoft" | "ics_feed";
export type AuthMethod = "oauth2" | "none";

/** プロバイダー差異を吸収した正規化イベント */
export interface NormalizedEvent {
  externalId: string;         // プロバイダー側のイベントID
  title: string | null;
  startAt: string;            // ISO 8601 UTC
  endAt: string;
  attendeeEmails: string[];
  videoUrl: string | null;
  videoPlatform: "zoom" | "google_meet" | "teams" | null;
  etag: string | null;
  status: "confirmed" | "cancelled" | "tentative";
}

export interface SyncResult {
  events: NormalizedEvent[];
  nextSyncCursor: string | null;
}

/** 全プロバイダーが実装するインターフェース */
export interface CalendarProvider {
  readonly type: ProviderType;
  readonly authMethod: AuthMethod;

  /** OAuth認証URL生成 */
  getAuthUrl?(state: string): string;

  /** OAuthコールバック処理 */
  handleCallback?(code: string): Promise<{
    providerEmail: string;
    accessTokenEnc: string;
    refreshTokenEnc: string | null;
    tokenExpiresAt: string | null;
  }>;

  /** トークンリフレッシュ */
  refreshToken?(connection: ConnectionRecord): Promise<{
    accessToken: string;
    expiresIn: number;
  }>;

  /** イベント同期（差分 or フル） */
  syncEvents(
    connection: ConnectionRecord,
    syncCursor: string | null,
  ): Promise<SyncResult>;
}
```

#### プロバイダー別の実装方針

**Google Calendar（実装済み → リファクタリング）**
- OAuth 2.0 + Calendar API v3
- syncToken による差分同期
- conferenceData からのMeet URL抽出
- 既存 `src/lib/calendar/google.ts` を `providers/google.ts` に移行

**Microsoft Outlook（新規）**
- Azure AD OAuth 2.0 + Microsoft Graph API
- `$deltaToken` による差分同期
- `onlineMeeting.joinUrl` からのTeams URL抽出
- `calendar_connections.provider = "microsoft"`

**ICS URL購読（新規）**
- ユーザーが貼ったICS URLを定期フェッチ（15分間隔）
- `ical.js` でVEVENTパース → NormalizedEvent変換
- ETag/Last-Modified でフェッチ最適化
- DESCRIPTION/LOCATION からのビデオURL抽出

### 1.3 DBスキーマ変更

```sql
-- google_event_id を汎用カラムに変更
ALTER TABLE calendar_events
  RENAME COLUMN google_event_id TO external_event_id;

-- calendar_connections の provider 値域を拡張
-- (現在 CHECK (provider IN ('google')) → 拡張)
ALTER TABLE calendar_connections
  DROP CONSTRAINT calendar_connections_provider_check,
  ADD CONSTRAINT calendar_connections_provider_check
    CHECK (provider IN ('google', 'microsoft', 'ics_feed'));

-- ICS URL購読用カラム追加
ALTER TABLE calendar_connections
  ADD COLUMN IF NOT EXISTS ics_url TEXT,
  ADD COLUMN IF NOT EXISTS ics_etag TEXT;
```

### 1.4 ビデオURL抽出の統一ロジック

```typescript
const VIDEO_PATTERNS = [
  { regex: /https?:\/\/[\w.-]*zoom\.us\/[jw]\/\d+[^\s)"]*/i, platform: "zoom" },
  { regex: /https?:\/\/meet\.google\.com\/[\w-]+/i, platform: "google_meet" },
  { regex: /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s)"]*/i, platform: "teams" },
];

function extractVideoUrl(event: NormalizedEvent): { url: string; platform: string } | null {
  const searchTargets = [event.videoUrl, event.title, /* DESCRIPTION等 */];
  for (const target of searchTargets) {
    if (!target) continue;
    for (const { regex, platform } of VIDEO_PATTERNS) {
      const match = target.match(regex);
      if (match) return { url: match[0], platform };
    }
  }
  return null;
}
```

### 1.5 同期フロー

```
ユーザーがカレンダーを接続
  ↓
calendar_connections に provider/tokens 保存
  ↓
POST /api/v1/calendar/sync
  ↓
CalendarService.sync(connection)
  ├─ provider = "google"    → GoogleProvider.syncEvents()
  ├─ provider = "microsoft" → MicrosoftProvider.syncEvents()
  └─ provider = "ics_feed"  → ICSFeedProvider.syncEvents()
  ↓
NormalizedEvent[] を calendar_events に UPSERT
  ↓
is_interconnect 判定（attendee_emailsにINTERCONNECTユーザーがいるか）
  ↓
Agent A: is_interconnect=true かつ video_url あり → 録音対象
```

### 1.6 自動同期（Cron）

```
Vercel Cron（15分間隔）
  ↓
全 active な calendar_connections を取得
  ↓
各接続に対して CalendarService.sync() を実行
  ↓
トークン期限切れ → 自動リフレッシュ
同期エラー → notifications テーブルに通知
```

---

## 2. 手動空き時間管理（第3層）

### 2.1 設計思想

カレンダーを連携しない/できないユーザーでも、日程調整に参加できる仕組み。
「普段の空き時間パターン」を一度だけ設定すれば、以降自動で候補が生成される。

### 2.2 DBスキーマ

```sql
-- 週間テンプレート（繰り返しパターン）
CREATE TABLE availability_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=日, 1=月, ...
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week, start_time)
);

-- 除外日・上書き（特定日の例外）
CREATE TABLE availability_overrides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_date    DATE NOT NULL,
  override_type  TEXT NOT NULL CHECK (override_type IN ('block', 'custom')),
  start_time     TIME,  -- override_type = 'custom' の場合のみ
  end_time       TIME,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_date, start_time)
);

-- user_profiles にタイムゾーン追加
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo';
```

### 2.3 空き時間の計算フロー

```
特定ユーザーの特定日の空き時間を計算:

1. availability_rules から曜日に該当するスロットを取得
   例: 火曜 → [10:00-12:00, 13:00-17:00]

2. availability_overrides で上書き
   例: 4/29 block → 空きなし
   例: 4/30 custom 10:00-12:00 → [10:00-12:00] のみ

3. calendar_events から該当日の予定を取得（同期済みの場合）
   例: 4/30 11:00-12:00 に会議 → [10:00-11:00, 13:00-17:00]

4. 最終的な空きスロット = テンプレート - 除外 - 既存予定
```

### 2.4 UI

**設定画面: 空き時間設定セクション**
```
┌─────────────────────────────────────────┐
│ 空き時間の設定                            │
│                                          │
│ 月  □                                    │
│ 火  ☑ [10:00] 〜 [17:00]                │
│ 水  ☑ [10:00] 〜 [17:00]                │
│ 木  □                                    │
│ 金  ☑ [13:00] 〜 [17:00]                │
│ 土  □                                    │
│ 日  □                                    │
│                                          │
│ 除外日:                                  │
│ ・4/29 (火) 終日ブロック   [削除]         │
│ ・5/3 (土) 〜 5/6 (火) GW  [削除]        │
│ [+ 除外日を追加]                          │
└─────────────────────────────────────────┘
```

---

## 3. 日程調整の自動化

### 3.1 空き時間照合API

```
GET /api/v1/scheduling/availability
  ?target_user_id=xxx
  &from=2026-04-28T00:00:00Z
  &to=2026-05-04T23:59:59Z
```

レスポンス:
```json
{
  "my_slots": [
    { "date": "2026-04-29", "start": "10:00", "end": "12:00" },
    { "date": "2026-04-29", "start": "13:00", "end": "17:00" }
  ],
  "their_slots": [
    { "date": "2026-04-29", "start": "09:00", "end": "12:00" },
    { "date": "2026-04-29", "start": "14:00", "end": "18:00" }
  ],
  "overlap_slots": [
    { "date": "2026-04-29", "start": "10:00", "end": "12:00" },
    { "date": "2026-04-29", "start": "14:00", "end": "17:00" }
  ]
}
```

**プライバシー**: 相手のスロットは「空き/予定あり」のみ。タイトル等は非公開。

### 3.2 自動候補提案API

```
POST /api/v1/scheduling/suggest
  { "target_user_id": "xxx", "duration_min": 30 }
```

レスポンス:
```json
{
  "suggestions": [
    { "date": "2026-04-29", "start": "10:00", "end": "10:30", "score": 95 },
    { "date": "2026-04-30", "start": "14:00", "end": "14:30", "score": 88 },
    { "date": "2026-05-02", "start": "15:00", "end": "15:30", "score": 82 }
  ]
}
```

スコア計算:
- 両者の空きスロット内: +50点
- 営業時間内(9:00-18:00): +20点
- 直近日優先: -5点/日
- 午前 > 午後 > 夕方: +10/+5/+0点
- 連続空き時間の中央: +10点（前後に余裕）

### 3.3 チャット内日程調整カード

会議リクエスト時にチャット内に「日程調整カード」を自動挿入。

```
┌──────────────────────────────────┐
│ 📅 日程調整                       │
│                                   │
│ おすすめの日時:                    │
│ ○ 4/29 (火) 10:00〜10:30         │
│ ○ 4/30 (水) 14:00〜14:30         │
│ ○ 5/2  (金) 15:00〜15:30         │
│                                   │
│ [この日程で決定]  [別の日時を提案]  │
└──────────────────────────────────┘
```

`chat_messages.content_type = "scheduling_card"` として格納。

---

## 4. チャット会議自動検知

### 4.1 設計思想

チャットで「来週火曜14時にZoomでやりましょう」と合意が形成された時、
Agent Aが自動でその会議を検知し、録音準備を行う。

### 4.2 2段階検知方式

**第1段階: 正規表現フィルタ（コストゼロ）**

メッセージPOST時に高速スクリーニング。パターンに一致しなければスキップ。

```typescript
const MEETING_INTENT_PATTERN =
  /(明日|来週|今週|(\d{1,2})(時|：|:)|月曜|火曜|水曜|木曜|金曜|Zoom|Meet|ミーティング|打ち合わせ|会議しま|MTGしま|オンラインで)/;
```

**第2段階: Haiku 意図判定（パターン一致時のみ）**

直近5メッセージをコンテキストとして渡し、会議意図を判定。

```json
{
  "intent": "confirmed" | "proposed" | "none",
  "datetime": "2026-04-29T14:00:00+09:00" | null,
  "platform": "zoom" | "meet" | null,
  "confidence": 0.92
}
```

判定基準:
- **confirmed** (confidence ≥ 0.8): 具体的日時 + 合意表現（「大丈夫です」「そうしましょう」）
- **proposed** (confidence 0.5-0.8): 日時不確定 or 片方の提案のみ
- **none**: 過去言及・事務連絡

### 4.3 検知後フロー

```
チャットメッセージ送信
  ↓
正規表現フィルタ → 一致?
  ├─ No → 通常のメッセージとして保存
  └─ Yes → Haiku意図判定
        ↓
    intent = "confirmed" かつ confidence ≥ 0.8?
      ├─ No → 通常のメッセージとして保存（proposedなら候補日時カードを表示）
      └─ Yes → チャット内に確認カードを挿入
              ↓
          ┌──────────────────────────────┐
          │ ミーティングを作成しますか？    │
          │ 📅 4/29 (火) 14:00           │
          │ 📹 Zoom                      │
          │ [作成する]  [キャンセル]       │
          └──────────────────────────────┘
              ↓ 「作成する」タップ
          POST /api/v1/meetings/from-chat
              ↓
          ・meetings テーブルに登録
          ・Zoom/Meet 会議リンク自動生成
          ・双方にICSメール送信（カレンダーに自動追加）
          ・Agent A: 録音予約
          ・双方に meeting_confirmed 通知
```

### 4.4 誤検知対策

- confidence < 0.5 → 完全無視
- 同一ルームで直近1時間以内にカードを出した場合 → スキップ
- 「キャンセル」直後の類似パターン → 24時間抑制
- system メッセージ（content_type ≠ "text"）→ 検知対象外

### 4.5 チャットメッセージの拡張

```sql
-- content_type に新しい値を追加
-- 既存: 'text', 'image', 'file'
-- 追加: 'scheduling_card', 'meeting_suggestion', 'meeting_confirmed'
ALTER TABLE chat_messages
  DROP CONSTRAINT chat_messages_content_type_check,
  ADD CONSTRAINT chat_messages_content_type_check
    CHECK (content_type IN ('text', 'image', 'file',
                            'scheduling_card', 'meeting_suggestion', 'meeting_confirmed'));
```

---

## 5. Agent A（tl;dv 置換）

### 5.1 設計思想

tl;dv を自前録音・文字起こし基盤に置換し、コストを1/8〜1/9に削減する。
Agent A は「会議の録音→文字起こし→分析」のパイプライン全体を指す。

### 5.2 録音基盤

| 方式 | 対象 | 実装 |
|---|---|---|
| Zoom Cloud Recording | Zoomミーティング | Webhook(recording.completed) → Download API |
| Google Meet | Meetミーティング | Workspace Events API or 手動アップロード |
| INTERCONNECT会議作成 | チャットで確定した会議 | INTERCONNECTがZoom/Meet会議を自動作成 → 録音自動 |

### 5.3 文字起こし

**推奨: Deepgram Nova-2**

| 項目 | 値 |
|---|---|
| コスト | $0.0043/分 |
| 日本語精度 | ○ |
| 話者分離 | 内蔵（diarize=true） |
| レイテンシ | 高速（ストリーム対応） |
| 1時間会議 | 約$0.26 |

### 5.4 パイプライン

```
会議終了
  ↓
録音ファイル取得（Zoom Download API or Google Drive API）
  ↓
Supabase Storage に一時保存
  ↓
Deepgram API（diarize=true, language=ja）
  ↓
TranscriptSegment[] 生成（speaker, text, startTime, endTime）
  ↓
meeting_transcripts テーブルに格納
  ↓
job_queue に "analyze" ジョブ登録
  ↓
Opus 4.6 構造化分析（既存 analyze.ts をそのまま使用）
  ↓
transcript_insights → aggregate → user_conversation_vectors → matching_scores_v4
```

### 5.5 コスト比較

| 規模 | tl;dv Pro | Agent A (Deepgram + Opus) |
|---|---|---|
| 4人（月20会議×30分） | ~$80/月 | ~$11/月 |
| 50人（月200会議） | ~$900/月 | ~$105/月 |
| 200人（月800会議） | ~$3,600/月 | ~$410/月 |

### 5.6 tl;dv からの移行戦略

```
Phase A: Zoom録音のみAgent A（tl;dv並行稼働）
  ↓
Phase B: Google Meet対応追加、新規会議は全てAgent A
  ↓
Phase C: tl;dv停止、APIキー無効化
```

---

## 6. 統合フロー: End-to-End

### 6.1 カレンダー → 日程調整 → 会議 → 分析

```
┌─ カレンダー同期 ─────────────────────────────────────────────────────┐
│                                                                      │
│  Google/Outlook/ICS → calendar_events に統合                         │
│  手動設定 → availability_rules / availability_overrides              │
│                                                                      │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌─ 日程調整 ──────────────────────────────────────────────────────────┐
│                                                                      │
│  空き時間照合（calendar_events + availability_rules を統合計算）       │
│  → 候補3件自動提案 → チャット内カード or 会議リクエスト画面           │
│                                                                      │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌─ 会議確定 ──────────────────────────────────────────────────────────┐
│                                                                      │
│  候補選択 or チャット合意検知 → meetings テーブルに登録               │
│  → Zoom/Meet 会議リンク自動生成                                       │
│  → ICSメール送信（任意のカレンダーに自動追加）                        │
│  → Agent A 録音予約                                                   │
│                                                                      │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌─ Agent A 録音・分析 ────────────────────────────────────────────────┐
│                                                                      │
│  会議開始 → Agent A Bot参加（or Cloud Recording取得）                 │
│  → Deepgram 文字起こし（話者分離付き）                                │
│  → meeting_transcripts に格納                                         │
│  → Opus 4.6 構造化分析                                               │
│  → user_conversation_vectors 更新                                     │
│  → matching_scores_v4 再計算                                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 チャット → 会議 → 分析（カレンダー不要フロー）

```
チャットで「来週火曜14時にZoomで」
  ↓
正規表現 + Haiku 検知 → 確認カード表示
  ↓
「作成する」→ meetings テーブル登録
  ↓
Zoom API で会議リンク生成 → meeting_url に保存
  ↓
ICSメール送信 → 双方のカレンダーに自動追加
  ↓
Agent A: scheduled_at の15分前に録音Bot準備
  ↓
会議開始 → Bot参加 → 録音 → 文字起こし → 分析 → スコア更新
```

---

## 7. API エンドポイント一覧

### 7.1 カレンダー（既存 + 拡張）

| メソッド | パス | 説明 | 状態 |
|---------|------|------|------|
| POST | /api/v1/calendar/connect | Google OAuth開始 | 実装済み |
| GET | /api/v1/calendar/callback | OAuthコールバック | 実装済み |
| POST | /api/v1/calendar/disconnect | カレンダー切断 | 実装済み |
| POST | /api/v1/calendar/sync | イベント同期 | 実装済み（要リファクタ） |
| GET | /api/v1/calendar/events | イベント一覧 | 実装済み |
| POST | /api/v1/calendar/microsoft/connect | Outlook OAuth開始 | **新規** |
| GET | /api/v1/calendar/microsoft/callback | Outlook コールバック | **新規** |
| POST | /api/v1/calendar/ics/subscribe | ICS URL登録 | **新規** |
| GET | /api/v1/calendar/feed/:token | ICSフィード公開 | **新規** |

### 7.2 スケジューリング（全て新規）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/v1/scheduling/availability | 空き時間照合 |
| POST | /api/v1/scheduling/suggest | 候補3件自動提案 |
| POST | /api/v1/scheduling/confirm | 日時確定 + 録音予約 |
| GET | /api/v1/scheduling/rules | 空き時間ルール取得 |
| PUT | /api/v1/scheduling/rules | 空き時間ルール更新 |
| POST | /api/v1/scheduling/overrides | 除外日追加 |
| DELETE | /api/v1/scheduling/overrides/:id | 除外日削除 |

### 7.3 チャット（既存 + 拡張）

| メソッド | パス | 説明 | 状態 |
|---------|------|------|------|
| GET | /api/v1/chat/rooms | ルーム一覧 | 実装済み |
| POST | /api/v1/chat/rooms | ルーム作成 | 実装済み |
| GET | /api/v1/chat/rooms/:id/messages | メッセージ一覧 | 実装済み |
| POST | /api/v1/chat/rooms/:id/messages | メッセージ送信 | 実装済み（検知ロジック追加要） |
| POST | /api/v1/chat/rooms/:id/read | 既読更新 | 実装済み |

### 7.4 会議（既存 + 拡張）

| メソッド | パス | 説明 | 状態 |
|---------|------|------|------|
| POST | /api/v1/meetings/from-chat | チャットから会議作成 | **新規** |
| GET | /api/v1/meetings/:id/ics | ICSファイルダウンロード | **新規** |

---

## 8. DBスキーマ全体像

### 8.1 新規テーブル

| テーブル | 目的 | 状態 |
|---------|------|------|
| calendar_connections | カレンダーOAuthトークン保存 | 実装済み |
| calendar_events | 同期済みイベント | 実装済み（要リネーム） |
| chat_rooms | 1:1チャットルーム | 実装済み |
| chat_messages | メッセージ | 実装済み |
| chat_analysis | Agent Aチャット分析結果 | 実装済み |
| availability_rules | 週間空き時間テンプレート | **新規** |
| availability_overrides | 除外日・例外 | **新規** |

### 8.2 既存テーブル変更

| テーブル | 変更内容 |
|---------|---------|
| calendar_events | `google_event_id` → `external_event_id` リネーム |
| calendar_connections | `provider` CHECK拡張、`ics_url`/`ics_etag` 追加 |
| chat_messages | `content_type` CHECK拡張 |
| user_profiles | `timezone` カラム追加 |
| meetings | `calendar_event_id` → 既存（変更なし） |

---

## 9. 実装ロードマップ

### Phase 1: 基盤整備 + 空き時間（1週間）

- [x] availability_rules / availability_overrides テーブル作成
- [x] user_profiles.timezone カラム追加
- [x] google_event_id → external_event_id リネーム
- [x] 空き時間設定UI（設定画面）
- [x] 空き時間照合API（GET /scheduling/availability）
- [x] 会議確定時ICSダウンロードボタン（Google/Outlook/iCal）

**マイルストーン**: 全ユーザーが空き時間を持ち、候補日時が自動提案される

**完了: 2026-04-27**

### Phase 2: 日程調整の自動化（1週間）

- [x] 候補3件自動提案API（POST /scheduling/suggest）— Phase 1で先行実装
- [x] チャット内日程調整カード（scheduling_card）
- [x] 会議リクエストUIの候補日時ピッカー改善
- [x] カレンダー同期のCron自動化（15分間隔）
- [x] POST /scheduling/confirm（日時確定 + 会議自動作成）
- [x] ICSコンテンツ生成ヘルパー（ics-email.ts）

**マイルストーン**: 「空いてる日を探す」手間がゼロになる

**完了: 2026-04-27**

### Phase 3: Outlook + ICS対応（1週間）

- [x] CalendarProvider 抽象化レイヤー構築 — Phase 1で先行実装
- [x] Microsoft Graph API連携（OAuth + 同期）
- [x] ICS URL購読機能
- [x] calendar_connections.provider 拡張 — Phase 1で先行実装
- [x] ICSフィード公開（/api/v1/calendar/feed/:token）
- [x] sync/route.ts をCalendarService経由にリファクタ（全プロバイダー対応）

**マイルストーン**: あらゆるカレンダーアプリのユーザーが利用可能

**完了: 2026-04-27**

### Phase 4: チャット会議検知 + Agent A（1週間）

- [x] チャットメッセージの会議意図検知（正規表現 + Haiku 2段階）
- [x] 確認カードUI（meeting_suggestion + meeting_confirmed）
- [x] POST /meetings/from-chat（会議自動作成）
- [x] POST /scheduling/confirm（日程確定API）
- [x] Zoom Webhook受信（/api/v1/webhooks/zoom — recording.completed検知）
- [x] Agent A ingestハンドラ（Deepgram文字起こし → 既存analyzeパイプライン連携）
- [ ] Zoom/Meet 会議リンク自動生成（Zoom OAuth未取得のため保留）
- [ ] ICSメール自動送信（メール送信基盤未構築のため保留）

**マイルストーン**: チャットで決めた会議にAgent Aが自動追従する

**コア実装完了: 2026-04-27**（Zoom OAuth審査・メール基盤は別途）

---

## 10. コスト

| 項目 | コスト |
|------|--------|
| Google Calendar API | 無料 |
| Microsoft Graph API | 無料 |
| ICS URLポーリング | 無料（自前Cron） |
| Supabase（DB + Realtime） | 既存Proプラン内 |
| Haiku チャット検知 | ~$0.001/回（月$5以下） |
| Deepgram 文字起こし | $0.0043/分 |
| Opus 分析 | ~$0.40/会議 |
| **カレンダー + チャット運用コスト** | **ゼロ** |

---

## 11. セキュリティ・プライバシー

| 項目 | 対策 |
|------|------|
| OAuthトークン | AES-256-GCM暗号化保存（CALENDAR_TOKEN_ENCRYPTION_KEY） |
| ICS URL | 暗号化保存（認証なしアクセス可能な秘密URL） |
| 空き時間照合 | 相手に「空き/予定あり」のみ表示。タイトル等は非公開 |
| チャットAI分析 | 初回同意バナー + localStorage保存 |
| 録音同意 | 会議作成時に「AIが録音・分析します」注意文表示 |
| 非ユーザー参加者 | Agent A Bot名「INTERCONNECT AI（録音中）」で暗黙通知 |
| データ保持 | 音声: 文字起こし完了後即削除。テキスト: 90日後null化 |

---

## 12. 未決事項・検証タスク

| # | 項目 | 優先度 | 備考 |
|---|------|--------|------|
| V1 | Deepgram日本語精度 | P0 | 本番導入前にPoC必須 |
| V2 | Haiku日本語会議検知精度 | P1 | チャットの曖昧表現対応 |
| V3 | Zoom Marketplace審査期間 | P1 | 4-8週間想定 |
| V4 | Azure ADアプリ審査 | P2 | Outlook連携用 |
| V5 | ICS URLの更新遅延 | P2 | プロバイダーごとの実測 |
| V6 | 90日自動削除Cron | P0 | プライバシーポリシーに記載あるが未実装 |

---

## 13. 現在の実装状態サマリー（2026-04-27時点）

### 13.1 何が完成しているか

**全コードはローカルに存在し、ビルド成功済み（pnpm build通過）。未コミット・未デプロイ・DBマイグレーション未実行。**

#### カレンダー — あらゆるカレンダーアプリに対応

| 対応方式 | 対象カレンダー | 実装ファイル |
|---------|--------------|-------------|
| Google Calendar API (OAuth) | Google Calendar | `providers/google.ts` + `calendar/connect`, `callback`, `sync`, `events` |
| Microsoft Graph API (OAuth) | Outlook / Microsoft 365 | `providers/microsoft.ts` + `calendar/microsoft/connect`, `callback` |
| ICS URL購読 (ポーリング) | Apple, Yahoo, サイボウズ, Garoon, Thunderbird, 他全て | `providers/ics-feed.ts` + `calendar/ics/subscribe` |
| 手動空き時間設定 | カレンダーアプリなし | `scheduling/rules`, `scheduling/overrides` |
| ICSフィード公開 | INTERCONNECT→任意カレンダー | `calendar/feed/[token]` |
| ICSダウンロード | 確定会議→任意カレンダー | `meetings/[id]/ics` + `calendar/links.ts` |

**設計思想**: CalendarProviderインターフェースで抽象化。新プロバイダー追加は1ファイル作成+登録のみ。

#### チャット

| 機能 | 実装ファイル |
|------|-------------|
| 1対1リアルタイムチャット | `chat/rooms`, `chat-messages.tsx` (Supabase Realtime) |
| 未読管理・通知 | `chat/rooms/[id]/read`, notifications連携 |
| 日程調整カード | `scheduling-card.tsx` + `scheduling/suggest` |
| 会議意図AI検知 | `meeting-detector.ts` (正規表現 + Haiku 2段階) |
| 会議確認カード | `meeting-suggestion-card.tsx` |
| チャットから会議作成 | `meetings/from-chat` |
| AI分析同意バナー | `chat-consent-banner.tsx` |

#### 日程調整

| 機能 | 実装ファイル |
|------|-------------|
| 空き時間照合（双方の空き→重なり算出） | `scheduling/availability` |
| 候補3件自動提案（スコアリング付き） | `scheduling/suggest` |
| 日時確定→会議自動作成 | `scheduling/confirm` |
| 週間テンプレート（普段の空き時間） | `scheduling/rules` + 設定画面UI |
| 除外日登録 | `scheduling/overrides` |

#### Agent A（tl;dv置換）

| 機能 | 実装ファイル |
|------|-------------|
| Zoom録音受信 (Webhook) | `webhooks/zoom` (recording.completed) |
| Deepgram文字起こし (話者分離付き) | `worker/src/handlers/ingest.ts` |
| 既存Opus分析パイプラインへの接続 | ingest → analyze → aggregate → score |
| 15分間隔カレンダー自動同期 | `calendar/cron` + `vercel.json` |

#### UI

| 画面 | 内容 |
|------|------|
| サイドバー | チャット + カレンダー ナビ追加 |
| チャットページ | スプリットパネル（ルーム一覧 + メッセージ）、モバイル対応 |
| カレンダーページ | 週表示 + イベントカード + 同期ボタン |
| 設定ページ | カレンダー連携（Google/Outlook/ICS）+ 空き時間設定 + フィードURL |
| 会議ページ | カレンダータブ + 「カレンダーに追加」ボタン（Google/Outlook/iCal） |
| 接続ページ | 「チャットを開始」ボタン |
| プロフィールモーダル | 会議リクエスト時に候補3件自動提案 |

### 13.2 何が未完了か

| 項目 | 理由 | 必要なアクション |
|------|------|-----------------|
| Zoom会議リンク自動生成 | Zoom Marketplace審査（4-8週間）が必要 | Zoom OAuthアプリ申請 |
| ICSメール自動送信 | メール送信基盤（Resend等）未構築 | メールサービス選定・実装 |
| DBマイグレーション実行 | ローカルのSQLファイルのみ | Supabase SQL Editorで実行 |
| 環境変数設定 | Microsoft/Zoom/Deepgram/Feed用 | .env.localに追加 |
| Deepgram日本語精度検証 | 本番導入前のPoC | テスト音声で検証 |
| Haiku会議検知精度チューニング | 日本語曖昧表現の対応 | テストデータで検証・プロンプト調整 |

### 13.3 デプロイまでに必要な手順

```
1. Supabaseで00006_calendar_chat.sql + 00007_scheduling_availability.sql を実行
2. 環境変数を設定:
   - CALENDAR_TOKEN_ENCRYPTION_KEY（64文字hex）
   - CALENDAR_FEED_SECRET（任意の秘密文字列）
   - CRON_SECRET（Vercel Cron認証用）
   - MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET（Outlook連携用）
   - ZOOM_WEBHOOK_SECRET（Zoom Webhook検証用）
   - DEEPGRAM_API_KEY（Agent A文字起こし用）
   - ANTHROPIC_API_KEY（既存 — Haiku会議検知で共用）
3. git commit + git push（Vercelに自動デプロイ）
4. Zoom Marketplace / Azure ADにアプリ申請（審査待ち）
```

### 13.4 ファイル構成

```
新規: 50ファイル
  ├── アーキテクチャ設計書 (1)
  ├── DBマイグレーション (2)
  ├── CalendarProvider抽象化 (8)
  ├── カレンダーAPI (10)
  ├── スケジューリングAPI (5)
  ├── チャットAPI (3)
  ├── 会議API (2)
  ├── Webhook (1)
  ├── チャットUI (6)
  ├── ページ (2)
  ├── Worker (1)
  ├── ライブラリ (4)
  ├── バリデーション (2)
  └── 設定 (1)

変更: 9ファイル
  ├── settings/page.tsx（カレンダー連携+空き時間UI）
  ├── meetings/page.tsx（カレンダータブ+追加ボタン）
  ├── connections/page.tsx（チャット開始ボタン）
  ├── profile-modal.tsx（候補日時自動提案）
  ├── sidebar.tsx（チャット+カレンダーナビ）
  ├── api-client.ts（putメソッド追加）
  ├── database.ts（全新規テーブル型）
  ├── index.ts（Availability/Scheduling型）
  └── worker/index.ts（ingestハンドラ登録）
```

### 13.5 コスト

| 項目 | コスト |
|------|--------|
| カレンダー同期（Google/Outlook/ICS） | **ゼロ**（全API無料枠内） |
| チャット（Supabase Realtime） | **ゼロ**（既存Proプラン内） |
| 日程調整 | **ゼロ** |
| Haiku会議検知 | ~$5/月（200ユーザー想定） |
| Agent A（Deepgram + Opus） | tl;dvの**1/8〜1/9**（50人で$105/月 vs tl;dv $900/月） |
