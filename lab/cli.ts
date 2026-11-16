import { automateCommand, verifyCommand } from './commands/verify.js';
import { hintCommand } from './commands/hint.js';
import { installWorkflowCommand } from './commands/install-workflow.js';
import { listCommand } from './commands/list.js';
import { reproduceCommand } from './commands/reproduce.js';
import { resetCommand, stopCommand } from './commands/reset-stop.js';
import { solutionCommand } from './commands/solution.js';
import { startCommand } from './commands/start.js';
import { parseArguments, type ParsedArguments } from './core/arguments.js';
import { print, style } from './core/console-output.js';
import { InfrastructureError, LabConfigurationError, UsageError } from './core/errors.js';
import { EXIT_CODES } from './core/verification.js';

type Command = (parsed: ParsedArguments) => Promise<number>;

const COMMANDS: Record<string, Command> = {
  list: () => listCommand(),
  start: ({ positionals }) => startCommand(positionals[0]),
  reproduce: ({ positionals }) => reproduceCommand(positionals[0]),
  hint: ({ positionals }) => hintCommand(positionals[0], positionals[1]),
  verify: ({ positionals }) => verifyCommand(positionals[0]),
  automate: ({ positionals }) => automateCommand(positionals[0]),
  reset: ({ positionals, flags }) => resetCommand(positionals[0], flags.has('yes')),
  stop: ({ positionals }) => stopCommand(positionals[0]),
  solution: ({ positionals, flags }) => solutionCommand(positionals[0], flags),
  'install-workflow': ({ positionals }) => installWorkflowCommand(positionals[0]),
};

const USAGE = `On-Call Gym - your first production incident, on localhost.

Usage: npm run lab -- <command> [scenario] [options]

  list                       scenarios, levels and your progress
  start <id>                 prepare (or resume) an attempt and start its services
  reproduce <id>             show the symptom against the running services
  hint <id> [n]              next hint, or hint n
  verify <id>                check your fix (exit 0 recovered, 1 still failing, 2 not verified)
  automate <id>              evaluate your automation on a variant of the incident
  reset <id> [--yes]         back to the starting code and data (asks before discarding changes)
  stop <id>                  stop the services of an attempt
  solution <id> --reveal     post-mortem and reference fix (--apply copies the fix into your workspace)
  install-workflow <id>      copy an Actions challenge workflow into .github/workflows`;

async function main(argv: readonly string[]): Promise<number> {
  const [name, ...rest] = argv;
  const command = name ? COMMANDS[name] : undefined;
  if (!command) {
    print(USAGE);
    return name && name !== 'help' ? EXIT_CODES.not_verified : 0;
  }
  return command(parseArguments(rest));
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  // Any lab crash exits with the "not verified" code so it can never be mistaken for a verdict.
  const expected = error instanceof UsageError || error instanceof LabConfigurationError || error instanceof InfrastructureError;
  print(style.yellow(expected ? error.message : `The lab crashed: ${error instanceof Error ? error.stack : String(error)}`));
  process.exitCode = EXIT_CODES.not_verified;
}
