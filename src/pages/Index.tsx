import { useMemo, useState } from "react";
import {
  Sparkles,
  Bot,
  Upload,
  Loader2,
  FileSpreadsheet,
  Download,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseFile } from "@/lib/parseFile";
import { exportRows } from "@/lib/exportFile";
import { categoryLabels } from "@/lib/format";

type RowMeta = {
  name_field: string | null;
  original_name: string | null;
  suggested_name: string | null;
  has_typo: boolean;
  category: string;
  explanation: string;
  accepted: boolean;
};

const Index = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [meta, setMeta] = useState<Record<number, RowMeta>>({});
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const analyzedCount = Object.keys(meta).length;
  const typoCount = useMemo(
    () => Object.values(meta).filter((m) => m.has_typo && !m.accepted).length,
    [meta],
  );
  const categorizedCount = useMemo(
    () => Object.values(meta).filter((m) => m.category).length,
    [meta],
  );

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const parsed = await parseFile(file);
      if (!parsed.rows.length) {
        toast.error("Arquivo vazio ou ilegível");
        return;
      }
      setFileName(file.name);
      setHeaders([...parsed.headers, "Categoria"]);
      setRows(parsed.rows);
      setMeta({});
      toast.success(`${parsed.rows.length} linhas carregadas`, {
        description: "Clique em \"Analisar com IA\" para detectar erros e categorizar.",
      });
    } catch (e: any) {
      toast.error("Erro ao ler o arquivo", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    if (!rows.length) return;
    setAnalyzing(true);
    try {
      const payload = rows.map((r, i) => ({ index: i, data: r }));
      const dataHeaders = headers.filter((h) => h !== "Categoria");

      // Process in chunks to keep prompts small
      const CHUNK = 25;
      const newMeta: Record<number, RowMeta> = {};
      for (let i = 0; i < payload.length; i += CHUNK) {
        const slice = payload.slice(i, i + CHUNK);
        const { data, error } = await supabase.functions.invoke("clean-rows", {
          body: { rows: slice, headers: dataHeaders },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        for (const r of data?.rows ?? []) {
          newMeta[r.index] = {
            name_field: r.name_field,
            original_name: r.original_name,
            suggested_name: r.suggested_name,
            has_typo: !!r.has_typo,
            category: r.category ?? "other",
            explanation: r.explanation ?? "",
            accepted: false,
          };
        }
        setMeta({ ...newMeta });
      }
      toast.success("Análise concluída", {
        description: `${
          Object.values(newMeta).filter((m) => m.has_typo).length
        } possíveis erros detectados.`,
      });
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao analisar", { description: e?.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const acceptSuggestion = (i: number) => {
    const m = meta[i];
    if (!m || !m.name_field || !m.suggested_name) return;
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [m.name_field!]: m.suggested_name } : r)),
    );
    setMeta((prev) => ({ ...prev, [i]: { ...prev[i], accepted: true } }));
  };

  const acceptAll = () => {
    let updated = [...rows];
    const newMeta = { ...meta };
    Object.entries(meta).forEach(([k, m]) => {
      if (m.has_typo && !m.accepted && m.name_field && m.suggested_name) {
        const i = Number(k);
        updated[i] = { ...updated[i], [m.name_field]: m.suggested_name };
        newMeta[i] = { ...m, accepted: true };
      }
    });
    setRows(updated);
    setMeta(newMeta);
    toast.success("Todas as correções aplicadas");
  };

  const exportData = (format: "csv" | "xlsx") => {
    const dataHeaders = headers.filter((h) => h !== "Categoria");
    const exportHeaders = [...dataHeaders, "categoria"];
    const out = rows.map((r, i) => ({
      ...r,
      categoria: meta[i]?.category ? categoryLabels[meta[i].category] ?? meta[i].category : "",
    }));
    const base = (fileName ?? "dados").replace(/\.(csv|xlsx?|txt)$/i, "");
    exportRows(out, exportHeaders, format, `${base}-limpo`);
    toast.success(`Exportado como ${format.toUpperCase()}`);
  };

  const reset = () => {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setMeta({});
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-glow" />

      <header className="relative border-b border-border/60 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-primary p-2 shadow-glow">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">
              Otimizador de Dados | Pedro Nunes
              </h1>
              <p className="text-xs text-muted-foreground">
                Limpeza de planilhas com IA — typos & categorização
              </p>
            </div>
          </div>
          {fileName && (
            <button
              onClick={reset}
              className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground sm:flex"
            >
              <RefreshCw className="h-3 w-3" />
              Novo arquivo
            </button>
          )}
        </div>
      </header>

      <main className="container relative space-y-8 py-10">
        {!rows.length ? (
          <>
            <section className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
                <Sparkles className="h-3 w-3" />
                CSV & Excel · análise por linha com IA
              </div>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Suba sua planilha e deixe a IA{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  arrumar tudo
                </span>
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                A IA detecta erros de digitação nos nomes (clientes, fornecedores, produtos) e
                sugere uma categoria para cada linha. Você revisa, aplica e exporta.
              </p>
            </section>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`relative rounded-xl border border-dashed transition-all ${
                dragging
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="rounded-full bg-gradient-primary p-3 shadow-glow">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
                  ) : (
                    <Upload className="h-6 w-6 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Arraste sua planilha aqui ou clique para enviar
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aceita .csv, .xlsx e .xls
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls,text/csv"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  disabled={loading}
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Stat
                label="Arquivo"
                value={fileName ?? ""}
                icon={FileSpreadsheet}
                tone="primary"
                truncate
              />
              <Stat
                label="Linhas"
                value={rows.length.toString()}
                icon={CheckCircle2}
                tone="muted"
              />
              <Stat
                label="Erros detectados"
                value={typoCount.toString()}
                icon={AlertTriangle}
                tone={typoCount > 0 ? "warning" : "success"}
              />
              <Stat
                label="Categorias atribuídas"
                value={`${categorizedCount}/${rows.length}`}
                icon={Sparkles}
                tone="success"
              />
            </section>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={analyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {analyzing
                  ? `Analisando… ${analyzedCount}/${rows.length}`
                  : analyzedCount > 0
                  ? "Reanalisar com IA"
                  : "Analisar com IA"}
              </button>

              {typoCount > 0 && (
                <button
                  onClick={acceptAll}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40"
                >
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Aplicar todas as correções
                </button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => exportData("csv")}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </button>
                <button
                  onClick={() => exportData("xlsx")}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </button>
              </div>
            </div>

            <DataTable rows={rows} headers={headers} meta={meta} onAccept={acceptSuggestion} />
          </>
        )}
      </main>
    </div>
  );
};

const Stat = ({
  label,
  value,
  icon: Icon,
  tone,
  truncate,
}: {
  label: string;
  value: string;
  icon: any;
  tone: "primary" | "success" | "warning" | "muted";
  truncate?: boolean;
}) => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-card">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-2 text-lg font-semibold text-foreground ${
            truncate ? "truncate" : ""
          }`}
          title={value}
        >
          {value}
        </p>
      </div>
      <div
        className={`rounded-lg p-2 ${
          tone === "primary"
            ? "bg-primary/10 text-primary"
            : tone === "success"
            ? "bg-success/10 text-success"
            : tone === "warning"
            ? "bg-warning/10 text-warning"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
    </div>
  </div>
);

const DataTable = ({
  rows,
  headers,
  meta,
  onAccept,
}: {
  rows: Record<string, any>[];
  headers: string[];
  meta: Record<number, RowMeta>;
  onAccept: (i: number) => void;
}) => {
  const dataHeaders = headers.filter((h) => h !== "Categoria");

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="max-h-[600px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-card-elevated text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">#</th>
              {dataHeaders.map((h) => (
                <th key={h} className="px-3 py-3 font-medium">
                  {h}
                </th>
              ))}
              <th className="px-3 py-3 font-medium">Categoria</th>
              <th className="px-3 py-3 font-medium">IA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => {
              const m = meta[i];
              return (
                <tr key={i} className="transition-colors hover:bg-card-elevated/60">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                  {dataHeaders.map((h) => {
                    const isNameField = m?.name_field === h;
                    const showFix = isNameField && m?.has_typo && !m.accepted;
                    return (
                      <td key={h} className="px-3 py-2.5 align-top">
                        <div className={isNameField ? "font-medium" : ""}>
                          {String(r[h] ?? "")}
                        </div>
                        {showFix && m?.suggested_name && (
                          <div className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs">
                            <span className="text-warning">Sugestão:</span>
                            <span className="text-foreground">{m.suggested_name}</span>
                            <button
                              onClick={() => onAccept(i)}
                              className="rounded bg-success/20 px-1.5 py-0.5 text-success hover:bg-success/30"
                            >
                              aplicar
                            </button>
                          </div>
                        )}
                        {isNameField && m?.accepted && (
                          <div className="mt-1 inline-flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="h-3 w-3" /> corrigido
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5">
                    {m?.category ? (
                      <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {categoryLabels[m.category] ?? m.category}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td
                    className="max-w-[220px] px-3 py-2.5 text-xs text-muted-foreground"
                    title={m?.explanation}
                  >
                    {m?.explanation || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Index;
