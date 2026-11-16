const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function paint(code: number, text: string): string {
  return useColor ? `\u001b[${code}m${text}\u001b[0m` : text;
}

export const style = {
  bold: (text: string) => paint(1, text),
  dim: (text: string) => paint(2, text),
  red: (text: string) => paint(31, text),
  green: (text: string) => paint(32, text),
  yellow: (text: string) => paint(33, text),
  cyan: (text: string) => paint(36, text),
};

export function print(text = ''): void {
  process.stdout.write(`${text}\n`);
}

export function heading(text: string): void {
  print();
  print(style.bold(text));
}

export function table(rows: readonly (readonly string[])[]): void {
  const widths = rows[0]?.map((_, column) => Math.max(...rows.map((row) => (row[column] ?? '').length))) ?? [];
  for (const row of rows) {
    print(row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join('  '));
  }
}
