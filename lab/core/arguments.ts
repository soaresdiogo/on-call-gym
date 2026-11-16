export interface ParsedArguments {
  readonly positionals: readonly string[];
  readonly flags: ReadonlySet<string>;
}

export function parseArguments(argv: readonly string[]): ParsedArguments {
  return {
    positionals: argv.filter((argument) => !argument.startsWith('--')),
    flags: new Set(argv.filter((argument) => argument.startsWith('--')).map((flag) => flag.slice(2))),
  };
}
