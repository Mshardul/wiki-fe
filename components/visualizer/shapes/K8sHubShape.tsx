import type { K8sHubModel, K8sHubPodRow } from "@/lib/visualizer/core/shapes";

const POD_LABEL: Record<string, string> = {
  ready: "Ready",
  running: "Running",
  creating: "ContainerCreating",
  crash: "CrashLoopBackOff",
  term: "Terminating",
};

function PodRow({ pod }: { pod: K8sHubPodRow }) {
  return (
    <div
      className={`viz-k8s-hub__pod viz-k8s-hub__pod--${pod.st}${pod.nw ? " viz-k8s-hub__pod--new" : ""}`}
    >
      <span>
        {pod.n} · {pod.img}
      </span>
      <span className="viz-k8s-hub__pod-st">
        {POD_LABEL[pod.st] ?? pod.st}
        {pod.r != null ? ` · restarts ${pod.r}` : ""}
      </span>
      {pod.ip ? <span>{pod.ip}</span> : null}
    </div>
  );
}

export function K8sHubShape({ model }: { model: K8sHubModel; subject: string }) {
  return (
    <div className="viz-k8s-hub" role="img" aria-label="Kubernetes control plane hub">
      {model.badge ? (
        <p className={`viz-k8s-hub__badge${model.badgeBad ? " viz-k8s-hub__badge--bad" : ""}`}>
          {model.badge}
        </p>
      ) : null}
      {model.term ? <pre className="viz-k8s-hub__term">{model.term}</pre> : null}
      <div className="viz-k8s-hub__grid">
        <div className="viz-k8s-hub__col">
          <p className="viz-k8s-hub__colttl">Control plane loops</p>
          <div className="viz-k8s-hub__stack">
            {model.actors.map((a) => (
              <div
                key={a.id}
                className={`viz-k8s-hub__actor${a.on ? " viz-k8s-hub__actor--on" : " viz-k8s-hub__actor--idle"}`}
              >
                <b>{a.name}</b>
                <span className="viz-k8s-hub__watch">{a.watch}</span>
                {a.on ? (
                  <>
                    <span className="viz-k8s-hub__ln">
                      <i>saw:</i> {a.on.saw}
                    </span>
                    <span className="viz-k8s-hub__ln">
                      <i>wrote:</i> {a.on.wrote}
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="viz-k8s-hub__col">
          <p className="viz-k8s-hub__colttl">API server · stored objects</p>
          <div className={`viz-k8s-hub__api${model.apiOn ? " viz-k8s-hub__api--on" : ""}`}>
            <div className="viz-k8s-hub__apihead">
              <span>kube-apiserver</span>
              <small>backed by etcd</small>
            </div>
            {model.objects.map((o) => (
              <div
                key={`${o.k}-${o.n}-${o.f}`}
                className={`viz-k8s-hub__obj${o.st ? ` viz-k8s-hub__obj--${o.st}` : ""}`}
              >
                <span className="viz-k8s-hub__obj-k">{o.k}</span>
                <span>{o.n}</span>
                <span>{o.f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="viz-k8s-hub__col">
          <p className="viz-k8s-hub__colttl">Nodes · kubelets</p>
          <div className="viz-k8s-hub__stack">
            {model.nodes.map((n) => {
              const k = model.kubelets[n.n];
              return (
                <div
                  key={n.n}
                  className={`viz-k8s-hub__node${n.bad ? " viz-k8s-hub__node--bad" : ""}`}
                >
                  <div className="viz-k8s-hub__nhead">
                    <span>{n.n}</span>
                    <small>{n.cap ?? "Ready"}</small>
                  </div>
                  <div
                    className={`viz-k8s-hub__actor viz-k8s-hub__kubelet${k ? " viz-k8s-hub__actor--on" : " viz-k8s-hub__actor--idle"}`}
                  >
                    <b>kubelet</b>
                    {k ? (
                      <>
                        <span className="viz-k8s-hub__ln">
                          <i>saw:</i> {k.saw}
                        </span>
                        <span className="viz-k8s-hub__ln">
                          <i>wrote:</i> {k.wrote}
                        </span>
                      </>
                    ) : (
                      <span className="viz-k8s-hub__watch">watches pods bound to this node</span>
                    )}
                  </div>
                  {n.pods.length ? (
                    n.pods.map((p) => <PodRow key={p.n} pod={p} />)
                  ) : (
                    <span className="viz-k8s-hub__nopods">no containers</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
