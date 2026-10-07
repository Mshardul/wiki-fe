import type { VarRow } from "@/lib/visualizer/core/types";

interface VarsTableProps {
  now: VarRow[];
  before: VarRow[] | null;
}

export function VarsTable({ now, before }: VarsTableProps) {
  const prev = new Map((before ?? []).map((r) => [r.name, r.value]));
  return (
    <div className="viz-vars">
      <table className="viz-vars__table">
        <thead>
          <tr>
            <th scope="col">name</th>
            <th scope="col">now</th>
            <th scope="col">before</th>
          </tr>
        </thead>
        <tbody>
          {now.map((r) => {
            const was = prev.get(r.name) ?? "—";
            return (
              <tr key={r.name}>
                <th scope="row">{r.name}</th>
                <td className={`viz-vars__now${was !== r.value ? " is-changed" : ""}`}>
                  {r.value}
                </td>
                <td className="viz-vars__before">{was}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
