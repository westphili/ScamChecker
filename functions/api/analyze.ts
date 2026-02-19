export interface Env {
  OPENAI_API_KEY: string;
}

type AnalyzeReq = { inputType: "email" | "text"; text: string };

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.OPENAI_API_KEY) return json({ error: "Missing OPENAI_API_KEY" }, 500);

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Expected application/json" }, 400);
  }

  const body = (await request.json()) as Partial<AnalyzeReq>;
  const inputType = body.inputType === "email" ? "email" : "text";
  const text = (body.text ?? "").trim();

  if (!text) return json({ error: "Missing text" }, 400);
  if (text.length > 15000) return json({ error: "Text too long" }, 413);

  const system = `You are a fraud and social engineering analyst.
Classify the MESSAGE (not the company/brand) as scam, likely_scam, unsure, or likely_legit.
If evidence is insufficient, choose "unsure".
Never instruct the user to click links or call numbers found in the message.
Provide safe verification steps using official channels.
Return ONLY valid JSON matching the schema.`;

  const user = `Message type: ${inputType}\nMessage text:\n${text}`;

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
  model: "gpt-5.2-mini",
  input: [
    { role: "system", content: system },
    { role: "user", content: user },
  ],
  text: {
  format: {
    type: "json_schema",
    json_schema: {
      name: "scam_check_result",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          verdict: { type: "string", enum: ["scam", "likely_scam", "unsure", "likely_legit"] },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          summary: { type: "string" },
          why: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 10 },
          red_flags: { type: "array", items: { type: "string" }, maxItems: 15 },
          safe_next_steps: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 10 },
          entities: {
            type: "object",
            additionalProperties: false,
            properties: {
              phones: { type: "array", items: { type: "string" } },
              emails: { type: "array", items: { type: "string" } },
              urls: { type: "array", items: { type: "string" } },
              requested_action: { type: "string" },
            },
            required: ["phones", "emails", "urls", "requested_action"],
          },
        },
        required: ["verdict", "confidence", "summary", "why", "red_flags", "safe_next_steps", "entities"],
      },
    },
  },
},



  if (!resp.ok) return json({ error: "OpenAI request failed", details: await resp.text() }, 502);

  const data = await resp.json();
  const out = (data?.output ?? []) as any[];
  const jsonItem = out.find((x) => x.type === "output_json");

  if (!jsonItem?.json) return json({ error: "No JSON output from model", raw: data }, 500);
  return json(jsonItem.json, 200);
};
