/**
 * Database type definitions for Supabase typed client.
 *
 * Generated/maintained manually based on:
 *  - sql/000_canonical_schema.sql (legacy 34 tables)
 *  - supabase/migrations/00006_calendar_chat.sql
 *  - supabase/migrations/00007_scheduling_availability.sql
 *  - supabase/migrations/00009_meetings_jobs.sql
 *  - CALENDAR_CHAT_AGENT_A_ARCHITECTURE.md §8 (table list)
 *
 * Shape matches what `@supabase/postgrest-js` v2 expects:
 *  - Each table: { Row, Insert, Update, Relationships }
 *  - Each view:  { Row, Relationships }
 *
 * Update is `Partial<…same fields as Insert…>` so type narrowing works
 * (avoiding the previous `Record<string, unknown>` which is too permissive
 * and confuses Supabase v2 generic resolution).
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
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Update: Partial<{
          id: string;
          user_id: string;
          connected_user_id: string;
          status: ConnectionStatus;
          created_at: string | null;
          updated_at: string | null;
          responded_at: string | null;
        }>;
        Relationships: [];
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
        Update: Partial<{
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read: boolean | null;
          created_at: string | null;
        }>;
        Relationships: [];
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
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Update: Partial<{
          id: string;
          type: string;
          title: string | null;
          user_id: string | null;
          related_user_id: string | null;
          created_at: string | null;
        }>;
        Relationships: [];
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
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Update: Partial<{
          id: string;
          connection_id: string;
          user_a_id: string;
          user_b_id: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          created_at: string;
        }>;
        Relationships: [];
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
        Update: Partial<{
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          content_type: ChatContentType;
          is_read: boolean;
          created_at: string;
        }>;
        Relationships: [];
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
        Update: Partial<{
          id: string;
          room_id: string;
          analyzed_up_to_id: string | null;
          extracted_topics: Json;
          extracted_needs: Json;
          extracted_offers: Json;
          engagement_signals: Json;
          analyzed_at: string;
        }>;
        Relationships: [];
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
        Update: Partial<{
          id: string;
          user_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [];
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
        Update: Partial<{
          id: string;
          user_id: string;
          target_date: string;
          override_type: AvailabilityOverrideType;
          start_time: string | null;
          end_time: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };

      // ════════════════════════════════════════════════════════════════════
      // Meetings — migration 00009
      // ════════════════════════════════════════════════════════════════════
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
        Update: Partial<{
          id: string;
          request_id: string | null;
          title: string | null;
          scheduled_at: string;
          duration_min: number;
          status: string;
          platform: MeetingPlatform | string | null;
          meeting_url: string | null;
          calendar_event_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        }>;
        Relationships: [];
      };

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
        Update: Partial<{
          id: string;
          requester_id: string;
          target_id: string;
          status: string;
          proposed_times: Json | null;
          message: string | null;
          created_at: string | null;
          updated_at: string | null;
        }>;
        Relationships: [];
      };

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
        Update: Partial<{
          id: string;
          meeting_id: string;
          user_id: string;
          role: string | null;
          created_at: string | null;
        }>;
        Relationships: [];
      };

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
        Update: Partial<{
          id: string;
          external_meeting_id: string | null;
          full_text: string | null;
          raw_transcript: Json | null;
          status: string | null;
          source: string | null;
          created_at: string | null;
          updated_at: string | null;
        }>;
        Relationships: [];
      };

      // NOTE: legacy `meeting_participants` orphan removed; use
      // meeting_participants_v2 (declared above, created by 00009).

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
        Update: Partial<{
          id: string;
          job_type: string;
          payload: Json;
          status: string | null;
          priority: number | null;
          attempts: number | null;
          last_error: string | null;
          scheduled_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          event_date: string;
          start_time?: string | null;
          end_time?: string | null;
          event_type?: string | null;
          online_url?: string | null;
          location?: string | null;
          capacity?: number | null;
          max_participants?: number | null;
          price?: number | null;
          image_url?: string | null;
          organizer_id?: string | null;
          is_public?: boolean | null;
          is_cancelled?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          status?: string;
          registration_date?: string | null;
          attendance_status?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          attendance_confirmed_at?: string | null;
          special_requirements?: string | null;
          payment_status?: string | null;
        };
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          requester_id: string;
          recipient_id: string;
          status?: string;
          message?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          responded_at?: string | null;
        };
        Update: Partial<{
          id: string;
          requester_id: string;
          recipient_id: string;
          status: string;
          message: string | null;
          created_at: string | null;
          updated_at: string | null;
          responded_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          match_request_id?: string | null;
          match_score?: number | null;
          match_reasons?: Json | null;
          connected_at?: string | null;
        };
        Update: Partial<{
          id: string;
          user1_id: string;
          user2_id: string;
          match_request_id: string | null;
          match_score: number | null;
          match_reasons: Json | null;
          connected_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          inviter_id: string;
          invitee_email?: string | null;
          invitee_id?: string | null;
          invitation_code?: string | null;
          invite_link_id?: string | null;
          custom_message?: string | null;
          status?: string;
          points_earned?: number | null;
          reward_points?: number | null;
          reward_status?: string | null;
          reward_earned_at?: string | null;
          meeting_completed_at?: string | null;
          fraud_score?: number | null;
          verification_notes?: string | null;
          referral_data?: Json | null;
          accepted_by?: string | null;
          accepted_at?: string | null;
          registered_at?: string | null;
          sent_at?: string | null;
          expires_at?: string | null;
          created_at?: string | null;
        };
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          created_by: string;
          link_code: string;
          description?: string | null;
          is_active?: boolean | null;
          max_uses?: number | null;
          used_count?: number | null;
          referral_count?: number | null;
          conversion_count?: number | null;
          registration_count?: number | null;
          completion_count?: number | null;
          total_rewards_earned?: number | null;
          campaign_code?: string | null;
          metadata?: Json | null;
          last_used_at?: string | null;
          expires_at?: string | null;
          created_at?: string | null;
        };
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          user_id: string;
          total_earned?: number | null;
          balance?: number | null;
          available_points?: number | null;
          referral_points_earned?: number | null;
          referral_points_spent?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          total_earned: number | null;
          balance: number | null;
          available_points: number | null;
          referral_points_earned: number | null;
          referral_points_spent: number | null;
          created_at: string | null;
          updated_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          user_id: string;
          points: number;
          reason?: string | null;
          booking_id?: string | null;
          referral_code?: string | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          points: number;
          reason: string | null;
          booking_id: string | null;
          referral_code: string | null;
          created_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          booking_id: string;
          session_ref?: string | null;
          user_email: string;
          user_name?: string | null;
          staff_name?: string | null;
          scheduled_at: string;
          duration_minutes?: number | null;
          consultation_type?: string | null;
          consultation_details?: string | null;
          referral_code?: string | null;
          meeting_url?: string | null;
          status?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          session_id: string;
          user_id?: string | null;
          user_email?: string | null;
          referral_code?: string | null;
          status?: string | null;
          session_data?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<{
          id: string;
          session_id: string;
          user_id: string | null;
          user_email: string | null;
          referral_code: string | null;
          status: string | null;
          session_data: Json | null;
          created_at: string | null;
          updated_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          user_id?: string | null;
          invitation_id?: string | null;
          meeting_datetime?: string | null;
          meeting_method?: string | null;
          duration_minutes?: number | null;
          verification_methods?: Json | null;
          meeting_summary?: string | null;
          admin_notes?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
        };
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          user_id?: string | null;
          meeting_title?: string | null;
          meeting_date?: string | null;
          summary?: string | null;
          content?: string | null;
          participants?: string[] | null;
          topics?: string[] | null;
          action_items?: Json | null;
          referral_processed?: boolean | null;
          referral_invitation_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<{
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
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          user_id: string;
          theme?: string | null;
          language?: string | null;
          notifications_enabled?: boolean | null;
          email_notifications?: boolean | null;
          metadata?: Json | null;
          updated_at?: string | null;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          theme: string | null;
          language: string | null;
          notifications_enabled: boolean | null;
          email_notifications: boolean | null;
          metadata: Json | null;
          updated_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          name: string;
          company?: string | null;
          email: string;
          phone?: string | null;
          message: string;
          status?: string | null;
          admin_notes?: string | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          name: string;
          company: string | null;
          email: string;
          phone: string | null;
          message: string;
          status: string | null;
          admin_notes: string | null;
          created_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          title: string;
          content?: string | null;
          category?: string | null;
          is_published?: boolean | null;
          published_at?: string | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          title: string;
          content: string | null;
          category: string | null;
          is_published: boolean | null;
          published_at: string | null;
          created_at: string | null;
        }>;
        Relationships: [];
      };

      site_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string | null;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_at?: string | null;
        };
        Update: Partial<{
          key: string;
          value: Json;
          updated_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          user_id: string;
          device?: string | null;
          browser?: string | null;
          ip_address?: string | null;
          location?: string | null;
          logged_in_at?: string | null;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          device: string | null;
          browser: string | null;
          ip_address: string | null;
          location: string | null;
          logged_in_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          question: string;
          answer: string;
          category?: string | null;
          sort_order?: number | null;
          is_published?: boolean | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          question: string;
          answer: string;
          category: string | null;
          sort_order: number | null;
          is_published: boolean | null;
          created_at: string | null;
        }>;
        Relationships: [];
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
        Insert: {
          id?: string;
          title: string;
          company_description?: string | null;
          category?: string | null;
          background?: string | null;
          solution?: string | null;
          metrics?: Json | null;
          sort_order?: number | null;
          is_published?: boolean | null;
          created_at?: string | null;
        };
        Update: Partial<{
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
        }>;
        Relationships: [];
      };
    };
    Views: {
      // Backwards-compatibility views from canonical_schema.sql
      profiles: {
        Row: Database["public"]["Tables"]["user_profiles"]["Row"];
        Relationships: [];
      };
      events: {
        Row: Database["public"]["Tables"]["event_items"]["Row"];
        Relationships: [];
      };
      matchings: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          match_score: number | null;
          created_at: string | null;
        };
        Relationships: [];
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
