import { appendFileSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Money } from '../src/domain/money.js';

/**
 * Controlled failure for the GitHub Actions challenges: a fixture with a wrong expected
 * total makes this test fail on purpose, so a workflow's colour can be checked against it.
 */
const fixturePath = process.env.GYM_CANARY_FIXTURE ?? new URL('./fixtures/ci-canary.json', import.meta.url);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
  cart: { unitPriceCents: number; quantity: number }[];
  expectedTotalCents: number;
};

describe('CI canary', () => {
  it('totals the canary cart as the fixture expects', () => {
    // Lets the lab prove that this test really ran, whatever the workflow printed.
    if (process.env.GYM_TEST_MARKER) appendFileSync(process.env.GYM_TEST_MARKER, 'ci-canary ran\n');

    const total = fixture.cart.reduce((sum, line) => sum.add(Money.fromCents(line.unitPriceCents).times(line.quantity)), Money.zero());

    expect(total.toCents()).toBe(fixture.expectedTotalCents);
  });
});
