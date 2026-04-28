import { Database, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type Doc = {
  status: string;
  amount: number | null;
};

export const StatsCards = ({ docs }: { docs: Doc[] }) => {
  const total = docs.length;
  const done = docs.filter((d) => d.status === "done").length;
  const processing = docs.filter(
    (d) => d.status === "processing" || d.status === "pending",
  ).length;
  const errors = docs.filter((d) => d.status === "error").length;
  const sum = docs
    .filter((d) => d.status === "done" && typeof d.amount === "number")
    .reduce((acc, d) => acc + (d.amount || 0), 0);

  const items = [
    {
      label: "Documentos ingeridos",
      value: total.toString(),
      icon: Database,
      tone: "primary",
    },
    {
      label: "Limpos & estruturados",
      value: done.toString(),
      icon: CheckCircle2,
      tone: "success",
    },
    {
      label: "Em processamento",
      value: processing.toString(),
      icon: Loader2,
      tone: "warning",
    },
    {
      label: "Valor total extraído",
      value: formatCurrency(sum),
      icon: AlertTriangle,
      tone: errors > 0 ? "destructive" : "muted",
      sub: errors > 0 ? `${errors} com erro` : undefined,
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {it.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{it.value}</p>
              {it.sub && (
                <p className="mt-1 text-xs text-destructive">{it.sub}</p>
              )}
            </div>
            <div
              className={`rounded-lg p-2 ${
                it.tone === "primary"
                  ? "bg-primary/10 text-primary"
                  : it.tone === "success"
                  ? "bg-success/10 text-success"
                  : it.tone === "warning"
                  ? "bg-warning/10 text-warning"
                  : it.tone === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <it.icon className="h-4 w-4" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-primary opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      ))}
    </div>
  );
};