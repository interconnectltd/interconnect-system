// src/lib/calendar/registry.ts — Provider registry

import type { CalendarProvider, ProviderType } from "./types";

const providers = new Map<ProviderType, CalendarProvider>();

/** Register a calendar provider implementation */
export function registerProvider(provider: CalendarProvider): void {
  providers.set(provider.type, provider);
}

/** Get a registered provider by type */
export function getProvider(type: ProviderType): CalendarProvider {
  const provider = providers.get(type);
  if (!provider) {
    throw new Error(
      `Calendar provider "${type}" is not registered. ` +
        `Available: ${[...providers.keys()].join(", ") || "(none)"}`,
    );
  }
  return provider;
}
