/**
 * ingest ハンドラ: Agent A 録音取り込みパイプライン
 * CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §5 — tl;dv 置換
 *
 * 録音ファイルを取得 → Deepgram で文字起こし → meeting_transcripts 格納 → analyze ジョブ投入
 */

import { supabase, enqueueJob } from "../queue";

// --- 型定義 ---

interface TranscriptSegment {
  speaker: string;   // "Speaker 0", "Speaker 1", etc.
  text: string;
  startTime: number; // seconds
  endTime: number;
}

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  speaker: number;
  punctuated_word?: string;
}

interface DeepgramAlternative {
  transcript: string;
  words: DeepgramWord[];
}

interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

interface DeepgramResponse {
  results: {
    channels: DeepgramChannel[];
  };
}

// --- 定数 ---

const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen";
const STORAGE_BUCKET = "recordings";

/**
 * Agent A ingest: 録音ダウンロード → Deepgram 文字起こし → DB格納 → analyze ジョブ投入
 */
export async function handleIngest(payload: {
  meeting_id: string;
  recording_url: string;
  recording_token?: string;
  participant_ids: string[];
}): Promise<void> {
  const { meeting_id, recording_url, recording_token, participant_ids } = payload;

  console.log(`[ingest] Starting ingest for meeting ${meeting_id}`);

  // -------------------------------------------------------
  // Step 1: Download the recording
  // -------------------------------------------------------
  console.log(`[ingest] Downloading recording from ${recording_url.slice(0, 80)}...`);

  const downloadHeaders: Record<string, string> = {};
  if (recording_token) {
    downloadHeaders["Authorization"] = `Bearer ${recording_token}`;
  }

  const downloadRes = await fetch(recording_url, { headers: downloadHeaders });
  if (!downloadRes.ok) {
    throw new Error(
      `[ingest] Failed to download recording: ${downloadRes.status} ${downloadRes.statusText}`,
    );
  }

  const audioBuffer = await downloadRes.arrayBuffer();
  const audioBytes = new Uint8Array(audioBuffer);
  console.log(`[ingest] Downloaded ${(audioBytes.length / 1024 / 1024).toFixed(1)} MB`);

  // -------------------------------------------------------
  // Step 2: Upload to Supabase Storage temporarily
  // -------------------------------------------------------
  const storagePath = `ingest/${meeting_id}/${Date.now()}.webm`;
  console.log(`[ingest] Uploading to storage: ${storagePath}`);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, audioBytes, {
      contentType: "audio/webm",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`[ingest] Storage upload failed: ${uploadError.message}`);
  }

  try {
    // -------------------------------------------------------
    // Step 3: Send to Deepgram for transcription
    // -------------------------------------------------------
    console.log(`[ingest] Sending to Deepgram (nova-2, ja, diarize=true)...`);

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      throw new Error("[ingest] DEEPGRAM_API_KEY env var is not set");
    }

    const deepgramParams = new URLSearchParams({
      model: "nova-2",
      language: "ja",
      diarize: "true",
      punctuate: "true",
    });

    const deepgramRes = await fetch(`${DEEPGRAM_URL}?${deepgramParams}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
        "Content-Type": "audio/webm",
      },
      body: audioBytes,
    });

    if (!deepgramRes.ok) {
      const errorBody = await deepgramRes.text().catch(() => "");
      throw new Error(
        `[ingest] Deepgram API error: ${deepgramRes.status} ${deepgramRes.statusText} — ${errorBody.slice(0, 200)}`,
      );
    }

    const deepgramData = (await deepgramRes.json()) as DeepgramResponse;
    console.log(`[ingest] Deepgram transcription complete`);

    // -------------------------------------------------------
    // Step 4: Parse Deepgram response into TranscriptSegments
    // -------------------------------------------------------
    const segments = parseDeepgramToSegments(deepgramData);
    console.log(`[ingest] Parsed ${segments.length} transcript segments`);

    // -------------------------------------------------------
    // Step 5: Build full_text
    // -------------------------------------------------------
    const fullText = segments
      .map((s) => `${s.speaker}: ${s.text}`)
      .join("\n");

    if (!fullText.trim()) {
      console.warn(`[ingest] Empty transcript for meeting ${meeting_id}, skipping`);
      return;
    }

    // -------------------------------------------------------
    // Step 6: Insert into meeting_transcripts
    // -------------------------------------------------------
    console.log(`[ingest] Inserting transcript (${fullText.length} chars)`);

    const { data: transcript, error: insertError } = await supabase
      .from("meeting_transcripts")
      .insert({
        external_meeting_id: meeting_id,
        full_text: fullText,
        raw_transcript: segments,
        status: "analyzed",
        source: "agent_a",
      })
      .select("id")
      .single();

    if (insertError || !transcript) {
      throw new Error(
        `[ingest] Failed to insert transcript: ${insertError?.message ?? "no data returned"}`,
      );
    }

    const transcriptId = transcript.id;
    console.log(`[ingest] Transcript inserted: ${transcriptId}`);

    // -------------------------------------------------------
    // Step 7: Create/update meeting_participants for each participant
    // -------------------------------------------------------
    if (participant_ids.length > 0) {
      console.log(`[ingest] Upserting ${participant_ids.length} participants`);

      for (const participantUserId of participant_ids) {
        const { error: partError } = await supabase
          .from("meeting_participants")
          .upsert(
            {
              transcript_id: transcriptId,
              user_id: participantUserId,
              is_linked: true,
            },
            { onConflict: "transcript_id,user_id" },
          );

        if (partError) {
          console.warn(
            `[ingest] Failed to upsert participant ${participantUserId}: ${partError.message}`,
          );
        }
      }
    }

    // -------------------------------------------------------
    // Step 8: Enqueue "analyze" jobs for each participant
    // -------------------------------------------------------
    console.log(`[ingest] Enqueuing analyze jobs`);

    // Fetch the participant records we just created to get their IDs
    const { data: participants } = await supabase
      .from("meeting_participants")
      .select("id, user_id")
      .eq("transcript_id", transcriptId);

    if (participants?.length) {
      for (const p of participants) {
        await enqueueJob(
          "analyze",
          { transcript_id: transcriptId, participant_id: p.id },
          2, // priority: slightly elevated
        );
        console.log(`[ingest] Enqueued analyze job for participant ${p.id}`);
      }
    } else {
      console.warn(`[ingest] No participants found after upsert, skipping analyze enqueue`);
    }
  } finally {
    // -------------------------------------------------------
    // Step 9: Delete recording from Supabase Storage (cleanup)
    // -------------------------------------------------------
    console.log(`[ingest] Cleaning up storage: ${storagePath}`);
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (deleteError) {
      console.warn(`[ingest] Storage cleanup failed (non-fatal): ${deleteError.message}`);
    }
  }

  console.log(`[ingest] Ingest complete for meeting ${meeting_id}`);
}

/**
 * Deepgram レスポンスを TranscriptSegment[] に変換
 * 話者分離された word を speaker ごとにグループ化
 */
function parseDeepgramToSegments(data: DeepgramResponse): TranscriptSegment[] {
  const words = data.results?.channels?.[0]?.alternatives?.[0]?.words;
  if (!words?.length) return [];

  const segments: TranscriptSegment[] = [];
  let currentSpeaker = -1;
  let currentWords: string[] = [];
  let segmentStart = 0;
  let segmentEnd = 0;

  for (const word of words) {
    if (word.speaker !== currentSpeaker) {
      // Flush previous segment
      if (currentWords.length > 0) {
        segments.push({
          speaker: `Speaker ${currentSpeaker}`,
          text: currentWords.join(" "),
          startTime: segmentStart,
          endTime: segmentEnd,
        });
      }
      // Start new segment
      currentSpeaker = word.speaker;
      currentWords = [];
      segmentStart = word.start;
    }

    currentWords.push(word.punctuated_word ?? word.word);
    segmentEnd = word.end;
  }

  // Flush final segment
  if (currentWords.length > 0) {
    segments.push({
      speaker: `Speaker ${currentSpeaker}`,
      text: currentWords.join(" "),
      startTime: segmentStart,
      endTime: segmentEnd,
    });
  }

  return segments;
}
