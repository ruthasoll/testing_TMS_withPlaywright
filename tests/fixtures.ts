import { test as base, expect } from '@playwright/test';
import { isProductionUrl } from './helpers/environment.js';

// Allow session actions only; never submit business changes from this starter suite.
export const test = base.extend<{ productionGuard: void }>({
  productionGuard: [async ({ context }, use) => {
    const blocked = new Set<string>();
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      const request = route.request();
      const parsed = new URL(url);
      const apiOrigin = new URL(process.env.TMS_API_URL ?? 'http://localhost:5050/tmsv2').origin;
      const sessionAction = request.method() === 'POST' && parsed.origin === apiOrigin && [
        '/api/auth/sign-in/email', '/api/auth/sign-out',
        '/auth/get-user-organizations', '/auth/switch-organization',
      ].some((path) => parsed.pathname.endsWith(path));
      const read = ['GET', 'HEAD', 'OPTIONS'].includes(request.method());
      const businessAction = /\/(create|update|delete|archive|restore|cancel|generate|print|send|sync|process|approve|reject|void|hold|continue|post|accept)(?:[A-Z/-]|$)/i.test(parsed.pathname);
      if (isProductionUrl(url) && process.env.TEST_ENV !== 'production-smoke') {
        blocked.add(parsed.origin);
        await route.abort('blockedbyclient');
      } else if (parsed.origin === apiOrigin && ((!read && !sessionAction) || businessAction)) {
        blocked.add(`${request.method()} ${parsed.pathname}`);
        await route.abort('blockedbyclient');
      } else if (!read && !sessionAction) {
        // Suppress analytics and other third-party writes during browser tests.
        await route.fulfill({ status: 204 });
      } else {
        await route.fallback();
      }
    });
    await use();
    expect([...blocked], 'Blocked a production or business-changing request. Check the environment and test action.').toEqual([]);
  }, { auto: true }],
});

export { expect };
