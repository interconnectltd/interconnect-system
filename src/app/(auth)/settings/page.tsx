import { CalendarConnectionsSection } from "@/components/settings/calendar-connections-section";
import { AvailabilityRulesSection } from "@/components/settings/availability-rules-section";
import { AvailabilityOverridesSection } from "@/components/settings/availability-overrides-section";
import { FeedUrlSection } from "@/components/settings/feed-url-section";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          カレンダー連携と空き時間を管理します
        </p>
      </div>

      <section aria-labelledby="calendar-connections-heading" className="space-y-3">
        <h2
          id="calendar-connections-heading"
          className="text-lg font-semibold"
        >
          カレンダー連携
        </h2>
        <CalendarConnectionsSection />
      </section>

      <section aria-labelledby="availability-rules-heading" className="space-y-3">
        <h2 id="availability-rules-heading" className="text-lg font-semibold">
          空き時間設定
        </h2>
        <AvailabilityRulesSection />
      </section>

      <section
        aria-labelledby="availability-overrides-heading"
        className="space-y-3"
      >
        <h2
          id="availability-overrides-heading"
          className="text-lg font-semibold"
        >
          除外日
        </h2>
        <AvailabilityOverridesSection />
      </section>

      <section aria-labelledby="feed-url-heading" className="space-y-3">
        <h2 id="feed-url-heading" className="text-lg font-semibold">
          フィードURL
        </h2>
        <FeedUrlSection />
      </section>
    </div>
  );
}
