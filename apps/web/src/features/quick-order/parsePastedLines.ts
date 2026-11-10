// One entry per non-blank line: part number first, quantity second.
export function parsePastedLines(text: string): { part: string; qty: string }[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const [part = '', qty = ''] = line.split(/[\t,;\s]+/).filter(Boolean);
      return { part, qty };
    });
}
