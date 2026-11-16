/** The lab itself could not run (missing tool, broken setup): never a verdict about the learner's fix. */
export class LabConfigurationError extends Error {}

/** The verifier could not reach a verdict, e.g. the store in the workspace never started. */
export class InfrastructureError extends Error {}

export class UsageError extends Error {}
