"use client";

/**
 * Legacy mount helper for the scheduling-suggestions component.
 *
 * Allows the legacy (non-Next.js) site to embed <SchedulingSuggestions />
 * inside any DOM node, e.g. the existing js/profile-modal-unified.js.
 *
 * Usage from the legacy bundle:
 *   <div id="suggestions"
 *        data-target-user-id="..."
 *        data-target-user-name="..."
 *        data-duration-min="30"
 *        data-compact="true"></div>
 *   <script>
 *     // After this module is loaded into the page bundle:
 *     window.mountSchedulingSuggestions("#suggestions");
 *   </script>
 *
 * NOTE: This file relies on react-dom/client (React 19) and assumes the
 * tanstack QueryClientProvider is already mounted higher in the tree —
 * either by the Next.js app or by the legacy bootstrap. If not, the
 * caller must wrap manually.
 *
 * TODO: The legacy site currently lives outside the Next.js bundle, so
 * wiring this requires an extra build target. Track in §13.1 follow-up.
 */

import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import SchedulingSuggestions, {
  type SchedulingSuggestion,
} from "./scheduling-suggestions";

// Module-level singleton: the legacy site has no React tree above this
// mount, so detecting a parent QueryClientProvider via try/catch around
// useQueryClient breaks rules-of-hooks. Always wrap in our own client.
const standaloneClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});

type MountOptions = {
  targetUserId: string;
  targetUserName?: string;
  durationMin?: number;
  compact?: boolean;
  onSelect?: (suggestion: SchedulingSuggestion) => void;
};

const roots = new WeakMap<Element, Root>();

function readDataset(
  el: HTMLElement,
  partial: Partial<MountOptions>,
): MountOptions {
  const targetUserId =
    partial.targetUserId ?? el.dataset["targetUserId"] ?? "";
  if (!targetUserId) {
    throw new Error(
      "[scheduling] mountSchedulingSuggestions: targetUserId is required",
    );
  }
  const durationRaw =
    partial.durationMin ?? Number(el.dataset["durationMin"] ?? "30");
  const compact =
    partial.compact ??
    (el.dataset["compact"] === "true" || el.dataset["compact"] === "1");
  return {
    targetUserId,
    targetUserName: partial.targetUserName ?? el.dataset["targetUserName"],
    durationMin: Number.isFinite(durationRaw) ? Number(durationRaw) : 30,
    compact: Boolean(compact),
    onSelect: partial.onSelect,
  };
}

function ProvidedSuggestions(props: MountOptions) {
  return (
    <QueryClientProvider client={standaloneClient}>
      <SchedulingSuggestions {...props} />
    </QueryClientProvider>
  );
}

declare global {
  interface Window {
    mountSchedulingSuggestions?: (
      target: string | Element,
      options?: Partial<MountOptions>,
    ) => () => void;
  }
}

export function mountSchedulingSuggestions(
  target: string | Element,
  options: Partial<MountOptions> = {},
): () => void {
  const el =
    typeof target === "string" ? document.querySelector(target) : target;
  if (!(el instanceof HTMLElement)) {
    throw new Error(
      `[scheduling] mountSchedulingSuggestions: element not found for ${String(target)}`,
    );
  }

  const resolved = readDataset(el, options);

  const existing = roots.get(el);
  if (existing) existing.unmount();

  const root = createRoot(el);
  roots.set(el, root);
  root.render(<ProvidedSuggestions {...resolved} />);

  return () => {
    const r = roots.get(el);
    if (r) {
      r.unmount();
      roots.delete(el);
    }
  };
}

if (typeof window !== "undefined") {
  window.mountSchedulingSuggestions = mountSchedulingSuggestions;
}

export default mountSchedulingSuggestions;
