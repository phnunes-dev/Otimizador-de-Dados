const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a data cleaning assistant. You receive tabular rows from a CSV/Excel
file. For each row you must:
1. Identify the most likely "name" field (person, company, customer, vendor, product) and detect
   typos or inconsistencies. If a fix is needed, propose a corrected name. If no fix is needed,
   return the original name unchanged.
2. Suggest ONE business category for the row, choosing from the list provided. If none fits, use
   "other".
3. Provide a short explanation (max 12 words) of any change.

Be conservative with name corrections: only fix obvious typos, casing issues (ACME sa → Acme S.A.),
missing accents, doubled letters, or trailing whitespace. Do NOT invent names.

Return ONLY through the provided tool call.`;

const CATEGORIES = [
  "office_expense",
  "travel",
  "supplier_invoice",
  "purchase_order",
  "receipt",
  "payroll",
  "utility",
  "marketing",
  "software",
  "food",
  "logistics",
  "other",
];

const TOOL = {
  type: "function" as const,
  function: {
    name: "clean_rows",
    description: "Return cleaned data for each row.",
    parameters: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "integer", description: "Original row index." },
              name_field: {
                type: ["string", "null"],
                description: "Column name detected as the entity name.",
              },
              original_name: { type: ["string", "null"] },
              suggested_name: { type: ["string", "null"] },
              has_typo: { type: "boolean" },
              category: { type: "string", enum: CATEGORIES },
              explanation: { type: "string" },
            },
            required: [
              "index",
              "name_field",
              "original_name",
              "suggested_name",
              "has_typo",
              "category",
              "explanation",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["rows"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const { rows, headers } = await req.json();
    if (!Array.isArray(rows) || !rows.length) {
      return new Response(JSON.stringify({ rows: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = `Headers: ${JSON.stringify(headers)}

Categories allowed: ${CATEGORIES.join(", ")}

Rows (each item has "index" and "data"):
${JSON.stringify(rows, null, 2)}`;

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
          { role: "user", content: userMessage },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "clean_rows" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`OpenAI error ${aiResp.status}: ${t}`);
    }

    const aiJson = await aiResp.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return tool call");
    const args = JSON.parse(call.function.arguments || "{}");

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("clean-rows error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});