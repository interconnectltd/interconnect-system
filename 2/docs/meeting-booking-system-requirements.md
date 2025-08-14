# 面談予約システム要件定義書

## 1. システム概要

### 1.1 プロジェクト概要
- **システム名**: INTERCONNECT 面談予約システム
- **目的**: 紹介リンクから登録したユーザーが、スタッフと面談予約を行うためのシステム
- **主要機能**: 
  - Google Calendar APIを使用した予約管理
  - 複数スタッフのカレンダー統合
  - 自動Google Meet URL生成
  - メール通知システム
  - 紹介リンクとの連携

### 1.2 システム構成
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   フロントエンド   │ ←→ │    Supabase     │ ←→ │  Google APIs    │
│   (Vue.js/React)  │     │   (Backend)     │     │ Calendar/Meet   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 2. 機能要件

### 2.1 予約作成機能

#### 2.1.1 スタッフ選択
- **機能説明**: 面談可能なスタッフの一覧表示と選択
- **詳細要件**:
  - スタッフプロフィール表示（写真、名前、役職、専門分野）
  - スタッフの空き時間リアルタイム表示
  - お気に入りスタッフ機能
  - スタッフ評価・レビュー表示

#### 2.1.2 日時選択
- **機能説明**: 選択したスタッフの空き時間から予約日時を選択
- **詳細要件**:
  - カレンダーUI（月表示/週表示切り替え）
  - 30分/60分単位での時間枠設定
  - 複数の候補日時の提案機能
  - タイムゾーン自動検出・変換
  - 休業日・祝日の自動除外

#### 2.1.3 予約詳細入力
- **機能説明**: 面談の目的や相談内容の入力
- **入力項目**:
  ```yaml
  必須項目:
    - 氏名
    - メールアドレス
    - 電話番号
    - 相談カテゴリ（選択式）
    - 相談内容（テキストエリア）
  
  任意項目:
    - 希望言語（日本語/英語）
    - 事前資料のアップロード
    - 特記事項
  ```

### 2.2 Google Calendar連携

#### 2.2.1 カレンダー同期
- **機能説明**: スタッフのGoogle Calendarと自動同期
- **技術仕様**:
  ```javascript
  // Google Calendar API設定
  const calendar = {
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    apiKey: process.env.GOOGLE_API_KEY,
    clientId: process.env.GOOGLE_CLIENT_ID
  };
  ```

#### 2.2.2 空き時間取得
- **API呼び出し例**:
  ```javascript
  // FreeBusy APIで空き時間を取得
  const getAvailableSlots = async (staffCalendarId, startDate, endDate) => {
    const response = await calendar.freebusy.query({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      items: [{ id: staffCalendarId }],
      timeZone: 'Asia/Tokyo'
    });
    return processFreeBusyData(response.data);
  };
  ```

#### 2.2.3 イベント作成
- **自動作成内容**:
  - イベントタイトル: `面談: [ユーザー名] - [相談カテゴリ]`
  - 場所: Google Meet URL（自動生成）
  - 参加者: スタッフ、ユーザー
  - リマインダー: 24時間前、1時間前

### 2.3 Google Meet統合

#### 2.3.1 Meet URL自動生成
- **実装方法**:
  ```javascript
  const createMeetingWithMeet = async (eventDetails) => {
    const event = {
      summary: eventDetails.title,
      start: { dateTime: eventDetails.startTime },
      end: { dateTime: eventDetails.endTime },
      attendees: eventDetails.attendees,
      conferenceData: {
        createRequest: {
          requestId: generateUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });
    
    return response.data.hangoutLink;
  };
  ```

#### 2.3.2 アクセス権限管理
- ゲストユーザーの自動招待
- 録画設定（オプション）
- 画面共有権限の事前設定

### 2.4 通知システム

#### 2.4.1 予約確認メール
- **送信タイミング**: 予約完了直後
- **メール内容**:
  ```
  件名: 面談予約確認 - INTERCONNECT
  
  本文:
  [ユーザー名]様
  
  面談のご予約ありがとうございます。
  以下の内容で予約を承りました。
  
  ■ 予約詳細
  日時: [日時]
  担当: [スタッフ名]
  場所: オンライン（Google Meet）
  Meet URL: [URL]
  
  ■ ご相談内容
  [相談内容]
  
  ■ 注意事項
  - 開始5分前にはMeet URLにアクセスしてください
  - カメラ・マイクの動作確認をお願いします
  ```

#### 2.4.2 リマインダー通知
- **通知スケジュール**:
  - 24時間前: メール + プッシュ通知
  - 1時間前: メール + プッシュ通知
  - 15分前: プッシュ通知のみ

#### 2.4.3 変更・キャンセル通知
- リアルタイム通知
- 関係者全員への自動通知

### 2.5 紹介リンク連携

#### 2.5.1 自動紐付け
- **実装ロジック**:
  ```javascript
  // 予約作成時の紹介者紐付け
  const createBookingWithReferral = async (bookingData, userId) => {
    // ユーザーの紹介情報を取得
    const referralInfo = await getReferralInfo(userId);
    
    if (referralInfo.referrerId) {
      // 予約と紹介者を紐付け
      bookingData.referral = {
        referrerId: referralInfo.referrerId,
        inviteCode: referralInfo.inviteCode,
        bonusEligible: true
      };
    }
    
    return await createBooking(bookingData);
  };
  ```

#### 2.5.2 報酬管理
- 面談完了時の自動ポイント付与
- 紹介者への通知
- 報酬履歴の記録

## 3. 非機能要件

### 3.1 セキュリティ要件

#### 3.1.1 認証・認可
- OAuth 2.0によるGoogle認証
- JWTトークンによるセッション管理
- Role-Based Access Control (RBAC)

#### 3.1.2 データ保護
- 個人情報の暗号化（AES-256）
- HTTPS通信の強制
- SQLインジェクション対策
- XSS対策

### 3.2 パフォーマンス要件
- ページ読み込み: 3秒以内
- API応答時間: 1秒以内
- 同時接続数: 1000ユーザー
- 可用性: 99.9%

### 3.3 スケーラビリティ
- 水平スケーリング対応
- CDN利用によるグローバル配信
- データベースのレプリケーション

## 4. データベース設計

### 4.1 主要テーブル

#### bookings（予約）
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    staff_id UUID REFERENCES staff_members(id),
    referral_id UUID REFERENCES invitations(id),
    
    -- 予約情報
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    
    -- 面談詳細
    consultation_category VARCHAR(100),
    consultation_details TEXT,
    preferred_language VARCHAR(20) DEFAULT 'ja',
    
    -- Google連携
    google_event_id VARCHAR(255),
    google_meet_url TEXT,
    calendar_synced BOOLEAN DEFAULT false,
    
    -- ステータス
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### staff_members（スタッフ）
```sql
CREATE TABLE staff_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    
    -- 基本情報
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    profile_image_url TEXT,
    
    -- 役職・専門
    position VARCHAR(100),
    department VARCHAR(100),
    specialties TEXT[],
    languages TEXT[] DEFAULT ARRAY['ja'],
    
    -- Google Calendar
    google_calendar_id VARCHAR(255),
    google_refresh_token TEXT,
    calendar_sync_enabled BOOLEAN DEFAULT true,
    
    -- 予約設定
    available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
    work_start_time TIME DEFAULT '09:00',
    work_end_time TIME DEFAULT '18:00',
    slot_duration_minutes INTEGER DEFAULT 30,
    buffer_minutes INTEGER DEFAULT 15,
    
    -- ステータス
    is_active BOOLEAN DEFAULT true,
    on_vacation BOOLEAN DEFAULT false,
    vacation_start DATE,
    vacation_end DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### booking_notifications（通知）
```sql
CREATE TABLE booking_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    recipient_id UUID REFERENCES auth.users(id),
    
    -- 通知内容
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- 配信情報
    channels TEXT[] DEFAULT ARRAY['email'],
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- ステータス
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 5. API設計

### 5.1 RESTful API エンドポイント

#### 予約関連
```yaml
# スタッフ一覧取得
GET /api/v1/staff
Response: {
  data: [{
    id: "uuid",
    displayName: "山田太郎",
    position: "シニアコンサルタント",
    specialties: ["事業戦略", "マーケティング"],
    averageRating: 4.8,
    nextAvailable: "2024-01-20T10:00:00Z"
  }]
}

# 空き時間取得
GET /api/v1/staff/{staffId}/availability
Query: {
  startDate: "2024-01-20",
  endDate: "2024-01-27",
  timezone: "Asia/Tokyo"
}
Response: {
  data: {
    slots: [{
      date: "2024-01-20",
      times: ["10:00", "10:30", "14:00", "14:30"]
    }]
  }
}

# 予約作成
POST /api/v1/bookings
Body: {
  staffId: "uuid",
  date: "2024-01-20",
  startTime: "10:00",
  duration: 30,
  category: "business_consultation",
  details: "新規事業について相談したい",
  language: "ja"
}
Response: {
  data: {
    id: "uuid",
    confirmationNumber: "BK-20240120-001",
    googleMeetUrl: "https://meet.google.com/xxx-yyyy-zzz",
    status: "confirmed"
  }
}
```

### 5.2 WebSocket Events

#### リアルタイム更新
```javascript
// 予約ステータス更新
socket.on('booking:updated', (data) => {
  console.log('Booking updated:', data);
  // UIを更新
});

// スタッフの空き状況変更
socket.on('availability:changed', (data) => {
  console.log('Availability changed:', data);
  // カレンダーを再描画
});
```

## 6. UI/UXデザイン要件

### 6.1 画面構成

#### 6.1.1 予約作成フロー
```
1. スタッフ選択画面
   ├─ スタッフカード一覧
   ├─ フィルター（専門分野、言語、評価）
   └─ 検索機能

2. 日時選択画面
   ├─ カレンダービュー
   ├─ 時間スロット一覧
   └─ タイムゾーン切り替え

3. 詳細入力画面
   ├─ フォーム入力
   ├─ 確認事項チェック
   └─ 送信ボタン

4. 予約完了画面
   ├─ 予約詳細表示
   ├─ カレンダー追加ボタン
   └─ Meet URL表示
```

### 6.2 レスポンシブデザイン
- モバイルファースト設計
- ブレークポイント: 640px, 768px, 1024px, 1280px
- タッチ操作最適化

### 6.3 アクセシビリティ
- WCAG 2.1 AA準拠
- キーボードナビゲーション対応
- スクリーンリーダー対応
- 高コントラストモード

## 7. 実装計画

### 7.1 フェーズ1（MVP - 4週間）
- [ ] 基本的な予約作成機能
- [ ] Google Calendar連携（読み取りのみ）
- [ ] メール通知（予約確認のみ）
- [ ] シンプルなUI実装

### 7.2 フェーズ2（拡張機能 - 4週間）
- [ ] Google Meet自動生成
- [ ] 双方向カレンダー同期
- [ ] リマインダー通知
- [ ] 予約変更・キャンセル機能

### 7.3 フェーズ3（最適化 - 2週間）
- [ ] パフォーマンス最適化
- [ ] UI/UXブラッシュアップ
- [ ] 多言語対応
- [ ] 分析ダッシュボード

## 8. テスト計画

### 8.1 単体テスト
- カバレッジ目標: 80%以上
- 重要関数の100%カバレッジ

### 8.2 統合テスト
- API連携テスト
- Google Calendar同期テスト
- 通知配信テスト

### 8.3 E2Eテスト
- 予約作成フロー全体
- エラーハンドリング
- 境界値テスト

### 8.4 負荷テスト
- 同時100ユーザーアクセス
- 1日1000件の予約処理

## 9. 運用・保守

### 9.1 監視項目
- APIレスポンスタイム
- エラー率
- Google API利用量
- データベース負荷

### 9.2 バックアップ
- データベース: 日次バックアップ
- 設定ファイル: Git管理
- ログ: 30日間保持

### 9.3 障害対応
- オンコール体制
- 障害時の代替手段
- ロールバック手順

## 10. コスト見積もり

### 10.1 初期開発費用
- 開発工数: 300人時間
- デザイン: 50人時間
- テスト: 100人時間

### 10.2 ランニングコスト（月額）
- Supabase: $25～
- Google Workspace: $12/ユーザー
- その他API: $50～

### 10.3 スケーリングコスト
- 1000ユーザーまで: 上記金額
- 10000ユーザー: 約10倍
- エンタープライズ: 個別見積もり

---

## 付録A: Google Calendar API実装詳細

### A.1 認証フロー
```javascript
// OAuth2認証の実装
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URL
);

// 認証URLの生成
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ]
});
```

### A.2 イベント作成詳細
```javascript
// カレンダーイベントの作成
const createCalendarEvent = async (oauth2Client, eventDetails) => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const event = {
    summary: eventDetails.title,
    location: 'Online',
    description: eventDetails.description,
    start: {
      dateTime: eventDetails.startDateTime,
      timeZone: 'Asia/Tokyo',
    },
    end: {
      dateTime: eventDetails.endDateTime,
      timeZone: 'Asia/Tokyo',
    },
    attendees: eventDetails.attendees.map(email => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
    conferenceData: {
      createRequest: {
        requestId: uuid.v4(),
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  };
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1,
    sendNotifications: true
  });
  
  return response.data;
};
```

## 付録B: セキュリティ実装ガイドライン

### B.1 入力検証
```javascript
// 予約データの検証
const validateBookingData = (data) => {
  const schema = Joi.object({
    staffId: Joi.string().uuid().required(),
    date: Joi.date().min('now').required(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    duration: Joi.number().valid(30, 60).required(),
    category: Joi.string().valid(...VALID_CATEGORIES).required(),
    details: Joi.string().max(1000).required(),
    language: Joi.string().valid('ja', 'en').default('ja')
  });
  
  return schema.validate(data);
};
```

### B.2 レート制限
```javascript
// API レート制限の実装
const rateLimit = require('express-rate-limit');

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の予約作成
  message: '予約作成の制限に達しました。しばらく待ってから再試行してください。',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/bookings', bookingLimiter);
```

---

この要件定義書は、INTERCONNECT面談予約システムの開発に必要な全ての要素を網羅しています。実装時は、この文書を基に詳細設計を行い、アジャイル開発手法で段階的に機能を実装していくことを推奨します。