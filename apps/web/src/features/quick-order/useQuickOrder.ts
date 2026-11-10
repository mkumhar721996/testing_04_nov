import { useEffect, useRef, useState } from 'react';
import { addCartLines, lookupParts } from '../../api/quickOrder';
import { parsePastedLines } from './parsePastedLines';
import { SAMPLE_LINES } from './sampleLines';
import type { CartLine, GridRow, PartMatch, RowResult } from './types';
import { validateRow } from './validateRow';

export interface Row extends GridRow {
  key: number;
  result: RowResult | null;
}

export type Outcome =
  | { kind: 'success'; ok: number }
  | { kind: 'partial'; ok: number; bad: number }
  | { kind: 'flagged'; bad: number }
  | { kind: 'empty' }
  | { kind: 'error' };

export interface QuickOrderApi {
  lookup?: (partNumbers: string[]) => Promise<PartMatch[]>;
  addToCart?: (lines: CartLine[]) => Promise<{ kind: 'ok' } | { kind: 'error' }>;
}

const INITIAL_ROWS = 3;
const norm = (part: string) => part.trim().toUpperCase();
const isFilled = (r: GridRow) => r.part.trim() !== '' || r.qty.trim() !== '';

let keySeq = 0;
const blank = (): Row => ({ key: ++keySeq, part: '', qty: '', added: false, result: null });
const withBlankLast = (rows: Row[]): Row[] => {
  const last = rows[rows.length - 1];
  return last && !isFilled(last) ? rows : [...rows, blank()];
};

export function useQuickOrder({ lookup = lookupParts, addToCart = addCartLines }: QuickOrderApi) {
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: INITIAL_ROWS }, blank));
  // Looked-up matches by upper-cased part number; null = looked up, no match.
  const [matches, setMatches] = useState<Record<string, PartMatch | null>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  async function fetchMatches(parts: string[]): Promise<Record<string, PartMatch | null>> {
    const wanted = [...new Set(parts.map(norm).filter(Boolean))];
    if (!wanted.length) return {};
    const found = await lookup(wanted);
    return Object.fromEntries(
      wanted.map((p) => [p, found.find((m) => norm(m.part) === p) ?? null]),
    );
  }

  async function refreshMatches(parts: string[]) {
    try {
      const fresh = await fetchMatches(parts);
      setMatches((m) => ({ ...m, ...fresh }));
    } catch {
      // The match cell stays empty; Add to cart looks the parts up again.
    }
  }

  const update = (key: number, field: 'part' | 'qty', value: string) => {
    setNote('');
    setRows((rs) =>
      withBlankLast(rs.map((r) => (r.key === key ? { ...r, [field]: value, result: null } : r))),
    );
  };

  const paste = (key: number, text: string): boolean => {
    if (!/\r?\n/.test(text.trim())) return false;
    fillFrom(
      rows.findIndex((r) => r.key === key),
      text,
    );
    return true;
  };

  // Starts at the first fully blank row that is not added (or after the last row).
  const pasteSample = () => {
    const blankAt = rows.findIndex((r) => !r.added && !isFilled(r));
    fillFrom(blankAt < 0 ? rows.length : blankAt, SAMPLE_LINES);
  };

  function fillFrom(start: number, text: string) {
    const lines = parsePastedLines(text);
    const end = start + lines.length;
    setRows((rs) => {
      const next = [...rs];
      while (next.length < end) next.push(blank());
      lines.forEach((l, k) => {
        next[start + k] = { ...blank(), part: l.part, qty: l.qty };
      });
      return withBlankLast(next);
    });
    setNote(`${lines.length} lines pasted into rows ${start + 1} to ${end}.`);
    setOutcome(null);
    void refreshMatches(lines.map((l) => l.part));
  }

  const addRow = () => {
    setNote('');
    setRows((rs) => [...rs, blank()]);
  };

  const removeRow = (key: number) => {
    setNote('');
    setRows((rs) => withBlankLast(rs.filter((r) => r.key !== key)));
  };

  const clear = () => {
    setRows([blank()]);
    setNote('');
    setOutcome(null);
    setToast('Grid cleared. Your cart is unchanged.');
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  async function add() {
    setNote('');
    const todo = rows.filter((r) => !r.added && isFilled(r));
    if (!todo.length) {
      setOutcome({ kind: 'empty' });
      return;
    }
    setPending(true);
    try {
      const fresh = await fetchMatches(todo.map((r) => r.part));
      setMatches((m) => ({ ...m, ...fresh }));
      const results = new Map(
        todo.map((r) => [r.key, validateRow(r, fresh[norm(r.part)] ?? undefined)] as const),
      );
      const lines = [...results.values()].flatMap((res) => (res?.ok ? res.lines : []));
      const ok = [...results.values()].filter((res) => res?.ok).length;
      const bad = results.size - ok;
      if (lines.length && (await addToCart(lines)).kind === 'error') {
        setOutcome({ kind: 'error' });
        return;
      }
      setRows((rs) =>
        rs.map((r) => {
          const res = results.get(r.key);
          return res ? { ...r, result: res, added: res.ok } : r;
        }),
      );
      setCart((c) => [...c, ...lines]);
      setOutcome(
        !bad ? { kind: 'success', ok } : !ok ? { kind: 'flagged', bad } : { kind: 'partial', ok, bad },
      );
    } catch {
      setOutcome({ kind: 'error' });
    } finally {
      setPending(false);
    }
  }

  return {
    rows,
    matches,
    cart,
    note,
    outcome,
    pending,
    toast,
    filled: rows.filter(isFilled).length,
    update,
    paste,
    pasteSample,
    addRow,
    removeRow,
    clear,
    add,
    checkPart: (part: string) => void refreshMatches([part]),
  };
}
