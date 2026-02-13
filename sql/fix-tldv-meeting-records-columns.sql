-- tldv_meeting_records テーブルに recording_url, transcript_url カラムを追加
-- tldv-webhook が recording.ready / transcript.ready イベントで使用
-- Supabase SQL Editor で実行してください

ALTER TABLE tldv_meeting_records
    ADD COLUMN IF NOT EXISTS recording_url TEXT,
    ADD COLUMN IF NOT EXISTS transcript_url TEXT;
