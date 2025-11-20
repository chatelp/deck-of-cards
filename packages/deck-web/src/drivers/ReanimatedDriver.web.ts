'use client';

import type { AnimationDriver } from '@deck/core';

// Re-export types from client driver (will be available at runtime on client)
export type { ReanimatedCardAnimationHandle } from './ReanimatedDriver.web.client';

// SSR-safe: Mock driver for server-side rendering
class MockReanimatedDriver implements AnimationDriver {
  register() {}
  unregister() {}
  async play() {}
  cancel() {}
}

// SSR-safe export: Use mock driver on server, real driver on client
let ReanimatedDriverClass: new () => AnimationDriver = MockReanimatedDriver;

// Only load real driver on client side
if (typeof window !== 'undefined') {
  // Dynamic ESM import for client-side only
  import('./ReanimatedDriver.web.client.js').then((clientDriver) => {
    ReanimatedDriverClass = clientDriver.ReanimatedDriver;
  }).catch((e) => {
    // Fallback to mock if client driver fails to load
    console.warn('Failed to load ReanimatedDriver client, using mock:', e);
  });
}

export const ReanimatedDriver = ReanimatedDriverClass;

