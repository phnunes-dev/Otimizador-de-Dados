import { useEffect, useState } from "react";
import { Sparkles, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Uploader } from "@/components/steward/Uploader";
import { StatsCards } from "@/components/steward/StatsCards";
import { DocumentsTable } from "@/components/steward/DocumentsTable";
import { CategoryBreakdown } from "@/components/steward/CategoryBreakdown";

const Index = () => {
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      setDocs(data ?? []);
    };
    load();

    const channel = supabase
      .channel("documents-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
              <h1 className="text-base font-semibold tracking-tight">Agentic Data Steward</h1>
              <p className="text-xs text-muted-foreground">
                Triagem, limpeza e enriquecimento de dados com IA
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Agente online
          </div>
        </div>
      </header>

      <main className="container relative space-y-8 py-10">
        <section className="space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3 w-3" />
            Pipeline multimodal · PDF, imagens e planilhas
          </div>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Transforme arquivos bagunçados em{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              dados estruturados
            </span>
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Envie recibos, faturas, e-mails ou planilhas de fornecedores. O agente faz triagem,
            extrai campos, normaliza nomes e datas, categoriza e salva tudo prontinho para BI.
          </p>
        </section>

        <Uploader />

        <StatsCards docs={docs} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
              <span className="text-xs text-muted-foreground">
                Atualização em tempo real
              </span>
            </div>
            <DocumentsTable docs={docs} />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Insights</h3>
            </div>
            <CategoryBreakdown docs={docs} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
