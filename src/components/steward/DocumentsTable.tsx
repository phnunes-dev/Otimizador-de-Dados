import { CheckCircle2, Loader2, AlertCircle, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabels, formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

type Doc = {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  status: string;
  category: string | null;
  vendor: string | null;
  amount: number | null;
  document_date: string | null;
  summary: string | null;
  error_message: string | null;
  created_at: string;
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    done: { label: "Limpo", cls: "bg-success/10 text-success", icon: CheckCircle2 },
    processing: {
      label: "Processando",
      cls: "bg-warning/10 text-warning",
      icon: Loader2,
    },
    pending: { label: "Na fila", cls: "bg-muted text-muted-foreground", icon: Clock },
    error: { label: "Erro", cls: "bg-destructive/10 text-destructive", icon: AlertCircle },
  };
  const v = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${v.cls}`}
    >
      <v.icon className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {v.label}
    </span>
  );
};

export const DocumentsTable = ({ docs }: { docs: Doc[] }) => {
  const remove = async (d: Doc) => {
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    supabase.storage.from("documents").remove([d.file_path]);
    toast.success("Documento removido");
  };

  const retry = async (d: Doc) => {
    await supabase
      .from("documents")
      .update({ status: "pending", error_message: null })
      .eq("id", d.id);
    supabase.functions.invoke("process-document", { body: { documentId: d.id } });
    toast.info("Reprocessando…");
  };

  if (!docs.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum documento ainda. Envie um PDF, imagem ou planilha para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card-elevated text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Arquivo</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Fornecedor</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {docs.map((d) => (
              <tr key={d.id} className="transition-colors hover:bg-card-elevated/60">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{d.file_name}</div>
                  {d.summary && (
                    <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {d.summary}
                    </div>
                  )}
                  {d.status === "error" && d.error_message && (
                    <div className="mt-0.5 line-clamp-1 text-xs text-destructive">
                      {d.error_message}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {d.category ? (
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {categoryLabels[d.category] ?? d.category}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-foreground">{d.vendor ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(d.document_date)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground">
                  {formatCurrency(d.amount)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {d.status === "error" && (
                      <button
                        onClick={() => retry(d)}
                        className="rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10"
                      >
                        Tentar novamente
                      </button>
                    )}
                    <button
                      onClick={() => remove(d)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};