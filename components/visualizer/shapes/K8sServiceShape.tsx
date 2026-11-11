import type { K8sServiceModel } from "@/lib/visualizer/core/shapes";

const EP_LABEL: Record<string, string> = {
  ready: "ready",
  no: "ready: false",
  term: "terminating",
};

const RULE_LABEL: Record<string, string> = {
  ok: "up to date",
  stale: "stale",
  new: "just updated",
  na: "not in use",
};

const POD_LABEL: Record<string, string> = {
  ready: "Ready",
  notready: "Not ready",
  term: "Terminating",
  exited: "Exited",
  new: "Ready (new)",
};

export function K8sServiceShape({ model }: { model: K8sServiceModel; subject: string }) {
  return (
    <div className="viz-k8s-svc" role="img" aria-label="Kubernetes Service path">
      {model.badge ? (
        <p className={`viz-k8s-svc__badge${model.badgeBad ? " viz-k8s-svc__badge--bad" : ""}`}>
          {model.badge}
        </p>
      ) : null}
      <div
        className={`viz-k8s-svc__epstrip${model.endpointsOn ? " viz-k8s-svc__epstrip--on" : ""}`}
      >
        <span className="viz-k8s-svc__eplbl">EndpointSlice web · API server</span>
        {model.endpoints.map((e) => (
          <span
            key={`${e.ip}-${e.pod}`}
            className={`viz-k8s-svc__ep${e.st === "ready" ? "" : ` viz-k8s-svc__ep--${e.st}`}`}
          >
            {e.pod} {e.ip} · {EP_LABEL[e.st] ?? e.st}
          </span>
        ))}
      </div>
      <div className="viz-k8s-svc__cols">
        <div className="viz-k8s-svc__col">
          <p className="viz-k8s-svc__colttl">Clients</p>
          {model.clients.map((c) => (
            <div
              key={c.n}
              className={`viz-k8s-svc__client${c.on ? " viz-k8s-svc__panel--on" : ""}`}
            >
              <div className="viz-k8s-svc__chd">
                <span>{c.n}</span>
                <small>on {c.node}</small>
              </div>
              <span className="viz-k8s-svc__sub">
                {c.note ?? "calls http://web → 10.96.0.20:80"}
              </span>
              {c.conns.length ? (
                c.conns.map((x, i) => (
                  <div key={i} className={`viz-k8s-svc__conn viz-k8s-svc__conn--${x.st}`}>
                    {x.label}
                  </div>
                ))
              ) : (
                <span className="viz-k8s-svc__sub">no open connections</span>
              )}
            </div>
          ))}
        </div>
        <div className="viz-k8s-svc__col">
          <p className="viz-k8s-svc__colttl">kube-proxy rules</p>
          {Object.entries(model.rules).map(([node, r]) => (
            <div
              key={node}
              className={`viz-k8s-svc__rules${r.on ? " viz-k8s-svc__panel--on" : ""}`}
            >
              <div className="viz-k8s-svc__chd">
                <span>{node}</span>
                <span className={`viz-k8s-svc__rstate viz-k8s-svc__rstate--${r.st}`}>
                  {RULE_LABEL[r.st] ?? r.st}
                </span>
              </div>
              <span className="viz-k8s-svc__sub">
                10.96.0.20:80 → {r.t.length ? "random pick from:" : "—"}
              </span>
              {r.t.length ? (
                <div className="viz-k8s-svc__rt">
                  {r.t.map((ip) => (
                    <span
                      key={ip}
                      className={r.gone?.includes(ip) ? "viz-k8s-svc__rt-gone" : undefined}
                    >
                      {ip}
                    </span>
                  ))}
                </div>
              ) : null}
              {r.note ? <span className="viz-k8s-svc__sub">{r.note}</span> : null}
            </div>
          ))}
        </div>
        <div className="viz-k8s-svc__col">
          <p className="viz-k8s-svc__colttl">Backend pods</p>
          {model.backends.map((p) => (
            <div
              key={p.n}
              className={`viz-k8s-svc__bpod viz-k8s-svc__bpod--${p.st}${
                p.on ? " viz-k8s-svc__panel--on" : ""
              }`}
            >
              <div className="viz-k8s-svc__chd">
                <span>
                  {p.n} · {p.ip}
                </span>
                <small>
                  {p.node} · {POD_LABEL[p.st] ?? p.st}
                </small>
              </div>
              {p.note ? <span className="viz-k8s-svc__sub">{p.note}</span> : null}
              <span className="viz-k8s-svc__sub">open connections: {p.conns ?? 0}</span>
              {p.load != null ? (
                <div className="viz-k8s-svc__load" title={`load ${p.load}%`}>
                  <i style={{ width: `${p.load}%` }} className={p.load >= 90 ? "hot" : undefined} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
