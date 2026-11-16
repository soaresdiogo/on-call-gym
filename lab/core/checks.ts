export type CheckKind = 'recovery' | 'regression';

export interface CheckResult {
  readonly id: string;
  readonly kind: CheckKind;
  readonly description: string;
  readonly passed: boolean;
  readonly detail: string;
}

/** Builder for check results, so verifiers read as a list of claims. */
export function check(id: string, kind: CheckKind, description: string) {
  return {
    passWhen(passed: boolean, detail: string): CheckResult {
      return { id, kind, description, passed, detail };
    },
  };
}
