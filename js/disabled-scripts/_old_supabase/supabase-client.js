/**
 * Supabase Client Configuration
 * 
 * SECURITY NOTE: 
 * - The anon key is safe to expose in frontend code as it only allows public access
 * - For production, consider using environment variables during build time
 * - Never expose service_role keys in frontend code
 */

// Supabase設定
// These values are safe for frontend use (anon key has limited permissions)
// For better security, inject these during build process using webpack/vite/etc
const SUPABASE_URL = 'https://whyoqhhzwtlxprhizmor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeW9xaGh6d3RseHByaGl6bW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjMyNzUsImV4cCI6MjA2NzA5OTI3NX0.HI03HObR6GkTmYh4Adm_DRkUOAssA8P1dhqzCH-mLrw';

// Supabase CDNから読み込み
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
script.onload = function() {
    // Supabaseクライアントの初期化
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    });
    
    // console.log('[SupabaseClient] Supabase initialized successfully');
    
    // 初期化完了イベント
    window.dispatchEvent(new Event('supabaseReady'));
};
document.head.appendChild(script);