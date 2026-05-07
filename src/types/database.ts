/**
 * Database type definitions for Supabase typed client.
 *
 * Generated/maintained manually based on:
 *  - sql/000_canonical_schema.sql (legacy 34 tables)
 *  - supabase/migrations/00006_calendar_chat.sql
 *  - supabase/migrations/00007_scheduling_availability.sql
 *  - CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §8 (table list)
 *
 * Coverage policy:
 *  - Tables actually queried by src/app/api/v1/* and worker/src/* have full
 *    Row/Insert/Update typings inferred from migrations.
 *  - Other legacy tables provide a structural Row to permit `.from(name)`
 *    without `any`, but field detail is intentionally minimal.
 *
 * Tables marked `// TODO: migration pending` are referenced in code but have
 * no canonical migration yet — types are forward-declared so the application
 * compiles. They must be backed by a real migration before production use.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ────────────────────────────────────────────────────────────────────────────
// Enums
// ────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "connection_request"
  | "meeting_request"
  | "meeting_confirmed"
  | "meeting_summary"
  | "introduction_request"
  | "introduction_completed"
  | "new_match_weekly"
  | "new_match_high"
  | "mutual_match"
  | "maturity_up"
  | "contact_exchange"
  | "intervention_alert"
  | "followup_reminder"
  | "system"
  | "chat_message";

export type MeetingPlatform = "zoom" | "google_meet" | "teams" | "in_person";

export type CalendarProvider = "google" | "microsoft" | "ics_feed";

export type ChatContentType =
  | "text"
  | "image"
  | "file"
  | "scheduling_card"
  | "meeting_suggestion"
  | "meeting_confirmed";

export type ConnectionStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "removed"
  | "blocked"
  | "reaccepted";

export type AvailabilityOverrideType = "block" | "custom";

// ────────────────────────────────────────────────────────────────────────────
// Database type
// ────────────────────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      // ════════════════════════════════════════════════════════════════════
      // Core profile
      // ════════════════════════════════════════════════════════════════════
      user_profiles: {
        Row: {
          id: string;
          member_id: string | null;
          name: string | null;
          full_name: string | null;
          email: string | null;
          company: string | null;
          position: string | null;
          industry: string | null;
          bio: string | null;
          phone: string | null;
          line_id: string | null;
          location: string | null;
          budget_range: string | null;
          business_challenges: Json | null;
          skills: string[] | null;
          interests: string[] | null;
          avatar_url: string | null;
          picture_url: string | null;
          cover_url: string | null;
          line_qr_url: string | null;
          is_active: boolean | null;
          is_online: boolean | null;
          is_admin: boolean | null;
          last_login_at: string | null;
          timezone: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          member_id?: string | null;
          name?: string | null;
          full_name?: string | null;
          email?: string | null;
          company?: string | null;
          position?: string | null;
          industry?: string | null;
          bio?: string | null;
          phone?: string | null;
          line_id?: string | null;
          location?: string | null;
          budget_range?: string | null;
          business_challenges?: Json | null;
          skills?: string[] | null;
          interests?: string[] | null;
          avatar_url?: string | null;
          picture_url?: string | null;
          cover_url?: string | null;
          line_qr_url?: string | null;
          is_active?: boolean | null;
          is_online?: boolean | null;
          is_admin?: boolean | null;
          last_login_at?: string | null;
          timezone?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
      };

      // ════════════════════════════════════════════════════════════════════
      // Connections / messaging
      // ════════════════════════════════════════════════════════════════════
      connections: {
        Row: {
          id: string;
          user_id: string;
          connected_user_id: string;
          status: ConnectionStatus;
          created_at: string | null;
          updated_at: string | null;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          connected_user_id: string;
          status?: ConnectionStatus;
          created_at?: string | null;
          updated_at?: string | null;
          responded_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["connections"]["Insert"]>;
      };

      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read?: boolean | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType | string | null;
          title: string | null;
          message: string | null;
          link: string | null;
          actions: Json | null;
          data: Json | null;
          is_read: boolean | null;
          created_at: string | null;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: NotificationType | string | null;
          title?: string | null;
          message?: string | null;
          link?: string | null;
          actions?: Json | null;
          data?: Json | null;
          is_read?: boolean | null;
          created_at?: string | null;
          read_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };

      activities: {
        Row: {
          id: string;
          type: string;
          title: string | null;
          user_id: string | null;
          related_user_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          type: string;
          title?: string | null;
          user_id?: string | null;
          related_user_id?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
      };

      // ════════════════════════════════════════════════════════════════════
      // Calendar (migration 00006 + 00007)
      // ════════════════════════════════════════════════════════════════════
      calendar_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: CalendarProvider;
          provider_email: string;
          access_token_enc: string;
          refresh_token_enc: string | null;
          token_expires_at: string | null;
          sync_cursor: string | null;
          last_synced_at: string | null;
          is_active: boolean;
          ics_url: string | null;
          ics_etag: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: CalendarProvider;
          provider_email: string;
          access_token_enc: string;
          refresh_token_enc?: string | null;
          token_expires_at?: string | null;
          sync_cursor?: string | null;
          last_synced_at?: string | null;
          is_active?: boolean;
          ics_url?: string | null;
          ics_etag?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["calendar_connections"]["Insert"]
        >;
      };

      calendar_events: {
        Row: {
          id: string;
          connection_id: string;
          user_id: string;
          external_event_id: string;
          title: string | null;
          start_at: string;
          end_at: string;
          video_url: string | null;
          video_platform: MeetingPlatform | null;
          attendee_emails: Json | null;
          is_interconnect: boolean;
          recording_enabled: boolean;
          linked_meeting_id: string | null;
          etag: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          user_id: string;
          external_event_id: string;
          title?: string | null;
          start_at?: string;
          end_at?: string;
          video_url?: string | null;
          video_platform?: MeetingPlatform | null;
          attendee_emails?: Json | null;
          is_interconnect?: boolean;
          recording_enabled?: boolean;
          linked_meeting_id?: string | null;
          etag?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["calendar_events"]["Insert"]
        >;
      };

      // ════════════════════════════════════════════════════════════════════
      // Chat (migration 00006 + 00007)
      // ════════════════════════════════════════════════════════════════════
      chat_rooms: {
        Row: {
          id: string;
          connection_id: string;
          user_a_id: string;
          user_b_id: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          user_a_id: string;
          user_b_id: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_rooms"]["Insert"]>;
      };

      chat_messages: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          content_type: ChatContentType;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id: string;
          content: string;
          content_type?: ChatContentType;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["chat_messages"]["Insert"]
        >;
      };

      chat_analysis: {
        Row: {
          id: string;
          room_id: string;
          analyzed_up_to_id: string | null;
          extracted_topics: Json;
          extracted_needs: Json;
          extracted_offers: Json;
          engagement_signals: Json;
          analyzed_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          analyzed_up_to_id?: string | null;
          extracted_topics?: Json;
          extracted_needs?: Json;
          extracted_offers?: Json;
          engagement_signals?: Json;
          analyzed_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["chat_analysis"]["Insert"]
        >;
      };

      // ════════════════════════════════════════════════════════════════════
      // Availability (migration 00007)
      // ════════════════════════════════════════════════════════════════════
      availability_rules: {
        Row: {
          id: string;
          user_id: string;
          day_of_week: number; // 0..6
          start_time: string; // HH:MM:SS
          end_time: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["availability_rules"]["Insert"]
        >;
      };

      availability_overrides: {
        Row: {
          id: string;
          user_id: string;
          target_date: string; // YYYY-MM-DD
          override_type: AvailabilityOverrideType;
          start_time: string | null;
          end_time: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_date: string;
          override_type: AvailabilityOverrideType;
          start_time?: string | null;
          end_time?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["availability_overrides"]["Insert"]
        >;
      };

      // ════════════════════════════════════════════════════════════════════
      // Meetings — referenced by code; canonical migration TODO
      // ════════════════════════════════════════════════════════════════════
      // TODO: migration pending — `meetings` exists implicitly via FKs
      // (calendar_events.linked_meeting_id) but has no canonical CREATE TABLE
      // in sql/000_canonical_schema.sql. Inferred from API usage.
      meetings: {
        Row: {
          id: string;
          request_id: string | null;
          title: string | null;
          scheduled_at: string;
          duration_min: number;
          status: string; // 'pending' | 'confirmed' | 'cancelled' | 'completed'
          platform: MeetingPlatform | string | null;
          meeting_url: string | null;
          calendar_event_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          title?: string | null;
          scheduled_at: string;
          duration_min: number;
          status?: string;
          platform?: MeetingPlatform | string | null;
          meeting_url?: string | null;
          calendar_event_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["meetings"]["Insert"]>;
      };

      // TODO: migration pending — referenced by from-chat / scheduling/confirm
      meeting_requests: {
        Row: {
          id: string;
          requester_id: string;
          target_id: string;
          status: string; // 'pending' | 'accepted' | 'confirmed' | 'rejected' | 'cancelled'
          proposed_times: Json | null;
          message: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          target_id: string;
          status?: string;
          proposed_times?: Json | null;
          message?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["meeting_requests"]["Insert"]
        >;
      };

      // TODO: migration pending — used by webhooks/zoom & meetings/from-chat
      meeting_participants_v2: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          role: string | null; // 'requester' | 'target' | 'guest'
          created_at: string | null;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          role?: string | null;
          created_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["meeting_participants_v2"]["Insert"]
        >;
      };

      // TODO: migration pending — used by worker/src/handlers/ingest.ts
      meeting_transcripts: {
        Row: {
          id: string;
          external_meeting_id: string | null;
          full_text: string | null;
          raw_transcript: Json | null;
          status: string | null; // 'pending' | 'analyzed' | 'failed'
          source: string | null; // 'agent_a' | 'tldv' etc.
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          external_meeting_id?: string | null;
          full_text?: string | null;
          raw_transcript?: Json | null;
          status?: string | null;
          source?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["meeting_transcripts"]["Insert"]
        >;
      };

      // TODO: migration pending — used by worker ingest/analyze pipeline
      meeting_participants: {
        Row: {
          id: string;
          transcript_id: string;
          user_id: string | null;
          is_linked: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          transcript_id: string;
          user_id?: string | null;
          is_linked?: boolean | null;
          created_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["meeting_participants"]["Insert"]
        >;
      };

      // TODO: migration pending — used by webhooks/zoom for async dispatch
      job_queue: {
        Row: {
          id: string;
          job_type: string;
          payload: Json;
          status: string | null; // 'queued' | 'running' | 'done' | 'failed'
          priority: number | null;
          attempts: number | null;
          last_error: string | null;
          scheduled_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          job_type: string;
          payload: Json;
          status?: string | null;
          priority?: number | null;
          attempts?: number | null;
          last_error?: string | null;
          scheduled_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["job_queue"]["Insert"]>;
      };

      // ════════════════════════════════════════════════════════════════════
      // Legacy tables — minimal Row, intentionally permissive
      // ════════════════════════════════════════════════════════════════════
      event_items: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          event_date: string;
          start_time: string | null;
          end_time: string | null;
          event_type: string | null;
          online_url: string | null;
          location: string | null;
          capacity: number | null;
          max_participants: number | null;
          price: number | null;
          image_url: string | null;
          organizer_id: string | null;
          is_public: boolean | null;
          is_cancelled: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["event_items"]["Row"]> & {
          title: string;
          event_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_items"]["Row"]>;
      };

      event_participants: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: string;
          registration_date: string | null;
          attendance_status: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          attendance_confirmed_at: string | null;
          special_requirements: string | null;
          payment_status: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["event_participants"]["Row"]
        > & { event_id: string; user_id: string };
        Update: Partial<
          Database["public"]["Tables"]["event_participants"]["Row"]
        >;
      };

      match_requests: {
        Row: {
          id: string;
          requester_id: string;
          recipient_id: string;
          status: string;
          message: string | null;
          created_at: string | null;
          updated_at: string | null;
          responded_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["match_requests"]["Row"]> & {
          requester_id: string;
          recipient_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["match_requests"]["Row"]>;
      };

      match_connections: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          match_request_id: string | null;
          match_score: number | null;
          match_reasons: Json | null;
          connected_at: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["match_connections"]["Row"]
        > & { user1_id: string; user2_id: string };
        Update: Partial<
          Database["public"]["Tables"]["match_connections"]["Row"]
        >;
      };

      invitations: {
        Row: {
          id: string;
          inviter_id: string;
          invitee_email: string | null;
          invitee_id: string | null;
          invitation_code: string | null;
          invite_link_id: string | null;
          custom_message: string | null;
          status: string;
          points_earned: number | null;
          reward_points: number | null;
          reward_status: string | null;
          reward_earned_at: string | null;
          meeting_completed_at: string | null;
          fraud_score: number | null;
          verification_notes: string | null;
          referral_data: Json | null;
          accepted_by: string | null;
          accepted_at: string | null;
          registered_at: string | null;
          sent_at: string | null;
          expires_at: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["invitations"]["Row"]> & {
          inviter_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Row"]>;
      };

      invite_links: {
        Row: {
          id: string;
          created_by: string;
          link_code: string;
          description: string | null;
          is_active: boolean | null;
          max_uses: number | null;
          used_count: number | null;
          referral_count: number | null;
          conversion_count: number | null;
          registration_count: number | null;
          completion_count: number | null;
          total_rewards_earned: number | null;
          campaign_code: string | null;
          metadata: Json | null;
          last_used_at: string | null;
          expires_at: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["invite_links"]["Row"]> & {
          created_by: string;
          link_code: string;
        };
        Update: Partial<Database["public"]["Tables"]["invite_links"]["Row"]>;
      };

      user_points: {
        Row: {
          id: string;
          user_id: string;
          total_earned: number | null;
          balance: number | null;
          available_points: number | null;
          referral_points_earned: number | null;
          referral_points_spent: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["user_points"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_points"]["Row"]>;
      };

      point_transactions: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          reason: string | null;
          booking_id: string | null;
          referral_code: string | null;
          created_at: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["point_transactions"]["Row"]
        > & { user_id: string; points: number };
        Update: Partial<
          Database["public"]["Tables"]["point_transactions"]["Row"]
        >;
      };

      bookings: {
        Row: {
          id: string;
          booking_id: string;
          session_ref: string | null;
          user_email: string;
          user_name: string | null;
          staff_name: string | null;
          scheduled_at: string;
          duration_minutes: number | null;
          consultation_type: string | null;
          consultation_details: string | null;
          referral_code: string | null;
          meeting_url: string | null;
          status: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["bookings"]["Row"]> & {
          booking_id: string;
          user_email: string;
          scheduled_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Row"]>;
      };

      booking_sessions: {
        Row: {
          id: string;
          session_id: string;
          user_id: string | null;
          user_email: string | null;
          referral_code: string | null;
          status: string | null;
          session_data: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["booking_sessions"]["Row"]
        > & { session_id: string };
        Update: Partial<
          Database["public"]["Tables"]["booking_sessions"]["Row"]
        >;
      };

      meeting_confirmations: {
        Row: {
          id: string;
          user_id: string | null;
          invitation_id: string | null;
          meeting_datetime: string | null;
          meeting_method: string | null;
          duration_minutes: number | null;
          verification_methods: Json | null;
          meeting_summary: string | null;
          admin_notes: string | null;
          confirmed_at: string | null;
          created_at: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["meeting_confirmations"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["meeting_confirmations"]["Row"]
        >;
      };

      meeting_minutes: {
        Row: {
          id: string;
          user_id: string | null;
          meeting_title: string | null;
          meeting_date: string | null;
          summary: string | null;
          content: string | null;
          participants: string[] | null;
          topics: string[] | null;
          action_items: Json | null;
          referral_processed: boolean | null;
          referral_invitation_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["meeting_minutes"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["meeting_minutes"]["Row"]
        >;
      };

      settings: {
        Row: {
          id: string;
          user_id: string;
          theme: string | null;
          language: string | null;
          notifications_enabled: boolean | null;
          email_notifications: boolean | null;
          metadata: Json | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
      };

      contact_inquiries: {
        Row: {
          id: string;
          name: string;
          company: string | null;
          email: string;
          phone: string | null;
          message: string;
          status: string | null;
          admin_notes: string | null;
          created_at: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["contact_inquiries"]["Row"]
        > & { name: string; email: string; message: string };
        Update: Partial<
          Database["public"]["Tables"]["contact_inquiries"]["Row"]
        >;
      };

      news_items: {
        Row: {
          id: string;
          title: string;
          content: string | null;
          category: string | null;
          is_published: boolean | null;
          published_at: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["news_items"]["Row"]> & {
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["news_items"]["Row"]>;
      };

      site_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string | null;
        };
        Insert: { key: string; value?: Json; updated_at?: string | null };
        Update: Partial<Database["public"]["Tables"]["site_settings"]["Row"]>;
      };

      login_sessions: {
        Row: {
          id: string;
          user_id: string;
          device: string | null;
          browser: string | null;
          ip_address: string | null;
          location: string | null;
          logged_in_at: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["login_sessions"]["Row"]
        > & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["login_sessions"]["Row"]>;
      };

      faqs: {
        Row: {
          id: string;
          question: string;
          answer: string;
          category: string | null;
          sort_order: number | null;
          is_published: boolean | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["faqs"]["Row"]> & {
          question: string;
          answer: string;
        };
        Update: Partial<Database["public"]["Tables"]["faqs"]["Row"]>;
      };

      case_studies: {
        Row: {
          id: string;
          title: string;
          company_description: string | null;
          category: string | null;
          background: string | null;
          solution: string | null;
          metrics: Json | null;
          sort_order: number | null;
          is_published: boolean | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["case_studies"]["Row"]> & {
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["case_studies"]["Row"]>;
      };
    };
    Views: {
      // Backwards-compatibility views from canonical_schema.sql
      profiles: {
        Row: Database["public"]["Tables"]["user_profiles"]["Row"];
      };
      events: {
        Row: Database["public"]["Tables"]["event_items"]["Row"];
      };
      matchings: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          match_score: number | null;
          created_at: string | null;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      notification_type: NotificationType;
      meeting_platform: MeetingPlatform;
    };
    CompositeTypes: Record<string, never>;
  };
};
