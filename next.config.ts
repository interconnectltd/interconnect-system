import type { NextConfig } from "next";

// Content Security Policy mirroring legacy netlify.toml rules, with
// additions required by the Next.js app (Vercel Analytics, Agent A
// backend calls, Zoom, Outlook OAuth, and Next.js dev/prod runtime).
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://apis.google.com https://static.line-scdn.net https://asset.timerex.net https://use.typekit.net https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://use.typekit.net https://p.typekit.net",
  "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com https://use.typekit.net",
  "img-src 'self' data: blob: https://*.supabase.co https://ui-avatars.com https://profile.line-scdn.net",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googleapis.com https://api.line.me https://access.line.me https://liff.line.me https://timerex.net https://performance.typekit.net https://api.deepgram.com https://api.anthropic.com https://api.zoom.us https://*.zoom.us https://login.microsoftonline.com https://graph.microsoft.com",
  "frame-src https://www.google.com https://timerex.net",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Phase 1 scaffolding: Database types are hand-written and lack the
    // strict shape Supabase needs (Relationships field). They will be
    // regenerated via `supabase gen types` once migrations are applied.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "profile.line-scdn.net",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
