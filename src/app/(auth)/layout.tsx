import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Network,
  MessageSquare,
  Calendar,
  Video,
  Bell,
  UserCircle,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/members", label: "メンバー", icon: Users },
  { href: "/matching", label: "マッチング", icon: Sparkles },
  { href: "/connections", label: "コネクション", icon: Network },
  { href: "/chat", label: "チャット", icon: MessageSquare },
  { href: "/calendar", label: "カレンダー", icon: Calendar },
  { href: "/meetings", label: "会議", icon: Video },
  { href: "/notifications", label: "通知", icon: Bell },
  { href: "/profile", label: "プロフィール", icon: UserCircle },
  { href: "/settings", label: "設定", icon: Settings },
];

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">INTERCONNECT</span>
        </Link>
      </header>
      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
          <nav className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col gap-1 overflow-y-auto p-3">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
