import { readFile } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';

const PUBLIC_DIRECTORY = new URL('../../public/', import.meta.url);

/** An explicit allowlist instead of a static directory: no path from the URL ever reaches the filesystem. */
const PAGES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/dashboard': { file: 'dashboard.html', type: 'text/html; charset=utf-8' },
  '/assets/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  '/assets/shop.js': { file: 'shop.js', type: 'text/javascript; charset=utf-8' },
  '/assets/dashboard.js': { file: 'dashboard.js', type: 'text/javascript; charset=utf-8' },
} as const;

export function registerUiRoutes(app: FastifyInstance): void {
  for (const [path, page] of Object.entries(PAGES)) {
    app.get(path, async (_request, reply) => {
      const content = await readFile(new URL(page.file, PUBLIC_DIRECTORY));
      return reply.type(page.type).send(content);
    });
  }
}
