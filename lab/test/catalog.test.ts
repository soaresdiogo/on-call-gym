import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allScenarios } from '../core/catalog.js';
import { loadHints } from '../core/hints.js';
import { scenarioDirectory } from '../core/paths.js';
import { faultyFiles } from '../core/workspace.js';

const POSTMORTEM_SECTIONS = ['**Impact.**', '**Root cause.**', '**Mitigation.**', '**Prevention.**', '**Automation idea.**'];

describe('scenario catalog', () => {
  it('has unique ids that match their folders', () => {
    const ids = allScenarios().map((scenario) => scenario.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(existsSync(scenarioDirectory(id)), id).toBe(true);
  });

  describe.each(allScenarios().map((scenario) => [scenario.id, scenario] as const))('%s', (id, scenario) => {
    const file = (name: string) => join(scenarioDirectory(id), name);

    it('has the learner material: brief, three hints and primary readings', async () => {
      expect(readFileSync(file('brief.md'), 'utf8')).toMatch(new RegExp(`^# ${id} `));
      expect(await loadHints(id)).toHaveLength(3);
      expect(scenario.readings.length).toBeGreaterThan(0);
      for (const reading of scenario.readings) expect(reading.url).toMatch(/^https:\/\//);
      expect(scenario.objective.length).toBeGreaterThan(20);
      expect(scenario.prerequisites.length).toBeGreaterThan(0);
    });

    it('has tutor notes, a post-mortem and a fault to apply', async () => {
      expect(existsSync(file('tutor.md'))).toBe(true);
      const postmortem = readFileSync(file('solution/postmortem.md'), 'utf8');
      for (const section of POSTMORTEM_SECTIONS) expect(postmortem, section).toContain(section);
      expect((await faultyFiles(scenario)).length).toBeGreaterThan(0);
      expect(scenario.expectedFailures.length).toBeGreaterThan(0);
    });

    it('ships an automation starter and reference when it has an automation exercise', () => {
      if (!scenario.automation) return;
      expect(existsSync(file(join('automation', 'starter')))).toBe(true);
      expect(existsSync(file(join('automation', 'reference')))).toBe(true);
    });
  });
});
