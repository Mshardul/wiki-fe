import type { BrokenLinkRow, OrphanRow } from "@/lib/admin/reports";

interface BrokenLinksTableProps {
  rows: BrokenLinkRow[];
}

export function BrokenLinksTable({ rows }: BrokenLinksTableProps) {
  return (
    <section className="admin-report-section">
      <h2 className="admin-report-heading">Broken Links ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="admin-empty">No broken links found.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Broken Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.sourcePath}:${r.target}`}>
                <td>{r.title}</td>
                <td className="admin-mono">{r.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

interface OrphansTableProps {
  rows: OrphanRow[];
}

export function OrphansTable({ rows }: OrphansTableProps) {
  return (
    <section className="admin-report-section">
      <h2 className="admin-report-heading">Orphan Pages ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="admin-empty">No orphan pages found.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Path</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.path}>
                <td>{r.title}</td>
                <td className="admin-mono">{r.path}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
