// functions/api/ephemeral.ts
export const onRequestGet: any = async (ctx: any) => {
  const OPENAI_API_KEY = (ctx.env as any).OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        // VAD only for speech start/stop events (we drive turns client-side)
        turn_detection: { type: "server_vad", threshold: 0.6, silence_duration_ms: 900 },

        // ---- TOOLS: structured updates (not spoken) ----
        tools: [
          {
            type: "function",
            name: "payload_upsert",
            description: "Update exactly one field in the quote payload.",
            parameters: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  enum: [
                    "vehicleDetails.make",
                    "vehicleDetails.model",
                    "vehicleDetails.year",
                    "previousClaims.claimMadeInLast3Years",
                    "previousClaims.claimAtFault",
                    "postalCode"
                  ]
                },
                value: {}
              },
              required: ["path", "value"],
              additionalProperties: false
            }
          },
          {
            type: "function",
            name: "manager_ready",
            description: "All required fields captured and validated. Return the final payload.",
            parameters: {
              type: "object",
              properties: {
                payload: {
                  type: "object",
                  properties: {
                    vehicleDetails: {
                      type: "object",
                      properties: {
                        make: { type: "string" },
                        model: { type: "string" },
                        year: { type: "number" }
                      },
                      required: ["make", "model", "year"]
                    },
                    previousClaims: {
                      type: "object",
                      properties: {
                        claimMadeInLast3Years: { type: "boolean" },
                        claimAtFault: { type: "boolean" }
                      },
                      required: ["claimMadeInLast3Years", "claimAtFault"]
                    },
                    postalCode: { type: "string" }
                  },
                  required: ["vehicleDetails", "previousClaims", "postalCode"]
                }
              },
              required: ["payload"],
              additionalProperties: false
            }
          }
        ],

        // ---- SYSTEM INSTRUCTIONS ----
        instructions: `
          You are a friendly, casual auto-insurance intake assistant. Stay strictly on auto insurance; ignore topics like mileage, commute, etc.

          TARGET PAYLOAD:
          {
            "vehicleDetails": { "make": string, "model": string, "year": number },
            "previousClaims": { "claimMadeInLast3Years": boolean, "claimAtFault": boolean },
            "postalCode": "string"
          }

          VALIDATION:
          • Postal → uppercase A1A1A1 with no spaces. • Year is 4 digits (e.g., 2017).

          CRITICAL RULES:
          1) Scope guard: Before answering, first decide if the user message helps complete the TARGET PAYLOAD.
            • If YES → proceed.
            • If NO → reply with the OFF-TOPIC REFUSAL TEMPLATE and immediately ask exactly one missing field.
          2) Use the tools exclusively to record fields (payload_upsert for each field, then manager_ready when complete). Never reveal or describe tool calls.
          3) Ask exactly ONE missing field at a time. Keep replies short, warm, and human—no interrogation vibe.
          4) Only acknowledge/thank if you actually recorded a field via tool call in this turn. If unclear/noise, apologize briefly and re-ask the SAME missing field.
          5) Do NOT proactively speak before the user says anything.
          6) No promises: Do not say you will chat later or after completion. If off-topic persists, repeat the OFF-TOPIC REFUSAL TEMPLATE verbatim and re-ask the same missing field.
          7) Never go outside the schema above or ask about miles, usage, etc.

          OFF-TOPIC REFUSAL TEMPLATE
          "Let's stay focused on your auto-insurance quote. I can't discuss that right now. \${NEXT_FIELD_PROMPT}"

          NEXT_FIELD_PROMPT should be a single short question for the next missing field, e.g.:
          • "What's your vehicle make?" OR
          • "What model is it?" OR
          • "What year is the vehicle?" OR
          • "What's your postal code (A1A1A1)?" OR
          • "In the last 3 years, did you file any claims?" (If the answer is no, skip asking about fault)
          • "If yes: Was the claim at fault?"
        `
      })
    });

    if (!r.ok) {
      const text = await r.text();
      return new Response(text, { status: r.status });
    }

    const data = await r.json();
    // Keep the same response shape your frontend expects:
    return new Response(JSON.stringify({ client_secret: data.client_secret }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(`realtime init failed: ${err?.message ?? err}`, { status: 500 });
  }
};
