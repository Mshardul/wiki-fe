import type { ConnectionPoolModel } from "@/lib/visualizer/core/shapes";
import { mechanismClockLabel } from "@/lib/visualizer/mechanism/clock-label";
import {
  ConnectionPoolFleetDiagram,
  ConnectionPoolLanesDiagram,
  ConnectionPoolSlotsDiagram,
  fleetStats,
} from "./ConnectionPoolDiagrams";

export function ConnectionPoolShape({ model }: { model: ConnectionPoolModel; subject: string }) {
  return (
    <div className="viz-cpool" role="img" aria-label="Connection pool stage">
      <div className="viz-cpool__meta">
        <span className="viz-cpool__clock">{mechanismClockLabel(model.clock)}</span>
        {model.badge ? (
          <span className={`viz-cpool__badge${model.badgeBad ? " viz-cpool__badge--bad" : ""}`}>
            {model.badge}
          </span>
        ) : null}
      </div>
      {model.term ? <pre className="viz-cpool__term">{model.term}</pre> : null}
      <div className="viz-cpool__tlwrap">
        {model.view === "lanes" ? (
          <ConnectionPoolLanesDiagram model={model} />
        ) : model.view === "fleet" ? (
          <ConnectionPoolFleetDiagram />
        ) : (
          <ConnectionPoolSlotsDiagram model={model} />
        )}
      </div>
      <div className="viz-cpool__sum">
        {model.view === "lanes" ? (
          (model.parties ?? []).map((p) => (
            <span key={p.name}>
              {p.name} <b>{p.view ?? ""}</b>
            </span>
          ))
        ) : model.view === "fleet" ? (
          (() => {
            const { closes, races } = fleetStats();
            return (
              <>
                <span>
                  uvicorn closes <b>{closes}</b>
                </span>
                <span>
                  closes that raced a request <b>{races}</b>
                </span>
                <span>
                  502s in app logs <b>{races}</b>
                </span>
              </>
            );
          })()
        ) : (
          <>
            <span>
              pool <b>{model.slots}</b>
            </span>
            <span>
              busy <b>{model.busy}</b>
            </span>
            <span>
              queued <b>{(model.queue ?? 0).toLocaleString("en-US")}</b>
            </span>
            <span>
              calls in flight at the API <b>{model.busy}</b>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
