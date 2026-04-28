import { categoryLabels, formatCurrency } from "@/lib/format";

type Doc = { category: string | null; amount: number | null; status: string };

export const CategoryBreakdown = ({ docs }: { docs: Doc[] }) => {
  const totals = new Map<string, { count: number; sum: number }>();
  for (const d of docs) {
    if (d.status !== "done" || !d.category) continue;
    const cur = totals.get(d.category) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += d.amount ?? 0;
    totals.set(d.category, cur);
  }
  const entries = Array.from(totals.entries()).sort((a, b) => b[1].sum - a[1].sum);
  const max = Math.max(1, ...entries.map(([, v]) => v.sum));

  if (!entries.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h3 className="text-sm font-semibold text-foreground">Categorias</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Aguardando documentos processados…
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <h3 className="text-sm font-semibold text-foreground">Distribuição por categoria</h3>
      <div className="mt-4 space-y-3">
        {entries.map(([cat, v]) => (
          <div key={cat}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">
                {categoryLabels[cat] ?? cat}{" "}
                <span className="text-muted-foreground">· {v.count}</span>
              </span>
              <span className="font-mono text-muted-foreground">{formatCurrency(v.sum)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-primary"
                style={{ width: `${(v.sum / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};