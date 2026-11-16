import { defineConfig } from 'vitest/config';

// The local GitHub Actions runner asks for a JSON report so challenge verifiers can
// prove that tests really ran; normal runs keep the default reporter only.
const testReportFile = process.env.GYM_TEST_REPORT;

export default defineConfig({
  test: {
    reporters: testReportFile ? ['default', 'json'] : ['default'],
    ...(testReportFile ? { outputFile: { json: testReportFile } } : {}),
    projects: [
      { test: { name: 'app', include: ['app/test/**/*.test.ts'] } },
      {
        test: {
          name: 'lab',
          include: ['lab/test/**/*.test.ts'],
          testTimeout: 120_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
