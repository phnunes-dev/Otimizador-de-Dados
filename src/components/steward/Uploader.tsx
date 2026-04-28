import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export const Uploader = () => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    try {
      for (const file of arr) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (upErr) throw upErr;

        const { data: inserted, error: insErr } = await supabase
          .from("documents")
          .insert({
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_path: path,
            status: "pending",
          })
          .select()
          .single();
        if (insErr) throw insErr;

        // fire and forget
        supabase.functions
          .invoke("process-document", { body: { documentId: inserted.id } })
          .catch((e) => console.error("process invoke", e));
      }
      toast.success(
        arr.length > 1 ? `${arr.length} arquivos enviados` : "Arquivo enviado",
        { description: "O agente está triando e extraindo os dados…" },
      );
    } catch (e: any) {
      console.error(e);
      toast.error("Falha no upload", { description: e?.message ?? "Tente novamente" });
    } finally {
      setUploading(false);
    }
  }, []);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
      }}
      className={`relative rounded-xl border border-dashed transition-all ${
        dragging
          ? "border-primary bg-primary/5 shadow-glow"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <div className="rounded-full bg-gradient-primary p-3 shadow-glow">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
          ) : (
            <Upload className="h-6 w-6 text-primary-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Arraste arquivos aqui ou clique para enviar
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, imagens (JPG/PNG), CSV, TXT — múltiplos aceitos
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>O agente IA fará triagem, limpeza e categorização automaticamente</span>
        </div>
        <input
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.csv,.txt,image/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={uploading}
        />
      </label>
    </div>
  );
};