export const MAX_PICKS = 4;
export const DS_SECTION_HEADING = "Data Structures";

export interface ComplexityTable {
  columns: string[];
  rows: { operation: string; values: Record<string, string> }[];
}

export interface StructureTable {
  title: string;
  table: ComplexityTable;
}

export interface MatrixCol {
  structureTitle: string;
  column: string;
}

export interface MergedMatrix {
  operations: string[];
  structures: { title: string; columns: string[] }[];
  cols: MatrixCol[];
  cell: (operation: string, structureTitle: string, column: string) => string;
}

/** Merge N parsed complexity tables into one Big-O matrix (union of ops; "—" for gaps). */
export function mergeComplexityMatrices(entries: StructureTable[]): MergedMatrix {
  const operations = [...new Set(entries.flatMap((e) => e.table.rows.map((r) => r.operation)))];
  const structures = entries.map((e) => ({ title: e.title, columns: e.table.columns }));
  const cols: MatrixCol[] = entries.flatMap((e) =>
    e.table.columns.map((column) => ({ structureTitle: e.title, column })),
  );

  function cell(operation: string, structureTitle: string, column: string): string {
    const entry = entries.find((e) => e.title === structureTitle);
    const row = entry?.table.rows.find((r) => r.operation === operation);
    return row?.values[column] ?? "—";
  }

  return { operations, structures, cols, cell };
}
