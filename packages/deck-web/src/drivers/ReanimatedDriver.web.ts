'use client';

import type { AnimationDriver } from '@deck/core';
import { ReanimatedDriver as ClientDriver } from './ReanimatedDriver.web.client';

export type { ReanimatedCardAnimationHandle } from './ReanimatedDriver.web.client';

// SSR-safe: Mock driver for server-side rendering
class MockReanimatedDriver implements AnimationDriver {
  register() {}
  unregister() {}
  async play() {}
  cancel() {}
}

// SSR-safe export: Use mock driver on server, real driver on client
export const ReanimatedDriver = typeof window === 'undefined' ? MockReanimatedDriver : ClientDriver;
