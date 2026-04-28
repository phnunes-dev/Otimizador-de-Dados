import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an Agentic Data Steward. You analyze ingested business documents
(invoices, receipts, purchase orders, supplier spreadsheets, emails) and return a clean,
normalized structured record. Always respond by calling the provided tool. Be conservative:
if a field is unknown, return null. Normalize: trim whitespace, unify casing for vendor
("Acme S.A." not "ACME SA"), use ISO date YYYY-MM-DD, amount as a plain number (no currency).`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "record_document",
    description: "Persist the cleaned, structured document record.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: [
            "office_expense",
            "travel",
            "supplier_invoice",
            "purchase_order",
            "receipt",
            "payroll",
            "utility",
            "marketing",
            "other",
          ],
          description: "High-level business category.",
        },
        vendor: { type: ["string", "null"], description: "Normalized vendor name." },
        amount: { type: ["number", "null"], description: "Total amount as a number." },
        document_date: {
          type: ["string", "null"],
          description: "ISO date YYYY-MM-DD.",
        },
        summary: {
          type: "string",
          description: "1-2 sentence human summary of the document.",
        },
        items: {
          type: "array",
          description: "Line items if available.",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: ["number", "null"] },
              unit_price: { type: ["number", "null"] },
              total: { type: ["number", "null"] },
            },
            required: ["description"],
            additionalProperties: false,
          },
        },
      },
      required: ["category", "vendor", "amount", "document_date", "summary", "items"],
      additionalProperties: false,
    },
  },
};

async function fetchAsBase64(url: string): Promise<string> {
  const r = await fetch(url);
  const buf = new Uint8Array(await r.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url);
  return await r.text();
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "\n...[truncated]" : s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let documentId: string | null = null;

  try {
    const body = await req.json();
    documentId = body.documentId;
    if (!documentId) throw new Error("documentId required");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (docErr || !doc) throw new Error("Document not found");

    await supabase
      .from("documents")
      .update({ status: "processing", error_message: null })
      .eq("id", documentId);

    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 600);
    if (!signed?.signedUrl) throw new Error("Could not sign file URL");

    const fileType: string = doc.file_type || "";
    const fileName: string = doc.file_name || "";
    const lower = fileName.toLowerCase();

    let userContent: any;

    if (fileType.startsWith("image/")) {
      const b64 = await fetchAsBase64(signed.signedUrl);
      userContent = [
        {
          type: "text",
          text: `Analyze this document image (filename: ${fileName}) and extract structured data.`,
        },
        {
          type: "image_url",
          image_url: { url: `data:${fileType};base64,${b64}` },
        },
      ];
    } else if (
      fileType === "application/pdf" ||
      lower.endsWith(".pdf")
    ) {
      // OpenAI supports PDF via file input as base64 with type=file
      const b64 = await fetchAsBase64(signed.signedUrl);
      userContent = [
        {
          type: "text",
          text: `Analyze this PDF (filename: ${fileName}) and extract structured data.`,
        },
        {
          type: "file",
          file: {
            filename: fileName,
            file_data: `data:application/pdf;base64,${b64}`,
          },
        },
      ];
    } else {
      // CSV / TXT / spreadsheet → send text
      const text = await fetchText(signed.signedUrl);
      userContent = `Filename: ${fileName}\nFile type: ${fileType}\n\nContent:\n${truncate(
        text,
        15000,
      )}`;
    }

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "record_document" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`OpenAI error ${aiResp.status}: ${t}`);
    }

    const aiJson = await aiResp.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return a tool call");

    const args = JSON.parse(call.function.arguments || "{}");

    await supabase
      .from("documents")
      .update({
        status: "done",
        category: args.category ?? null,
        vendor: args.vendor ?? null,
        amount: args.amount ?? null,
        document_date: args.document_date ?? null,
        summary: args.summary ?? null,
        items: args.items ?? null,
        raw_extraction: args,
        error_message: null,
      })
      .eq("id", documentId);

    return new Response(JSON.stringify({ success: true, data: args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-document error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (documentId) {
      await supabase
        .from("documents")
        .update({ status: "error", error_message: message })
        .eq("id", documentId);
    }
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});