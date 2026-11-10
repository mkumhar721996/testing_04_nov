export interface GridRow {
  part: string;
  qty: string;
  added: boolean;
}

export interface PartMatch {
  part: string;
  description: string;
  stock: { instance: string; available: number }[];
}

export interface CartLine {
  part: string;
  description: string;
  instance: string;
  quantity: number;
}

export type RowResult =
  | { ok: true; lines: CartLine[] }
  | { ok: false; field: 'part' | 'qty'; message: string };
