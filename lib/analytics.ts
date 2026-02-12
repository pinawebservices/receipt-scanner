import posthog from 'posthog-js';

let initialized = false;

export function initAnalytics() {
  if (typeof window === 'undefined' || initialized) return;

  const posthog_key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!posthog_key) return;

  posthog.init(posthog_key, {
    api_host: 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
  });

  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  posthog.capture(event, properties);
}

export function identifyUser(name: string) {
  if (typeof window === 'undefined') return;
  posthog.identify(name);
}
