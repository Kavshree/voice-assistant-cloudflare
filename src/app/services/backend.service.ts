import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class BackendService {
  // 🔹 Get ephemeral Realtime token
  async getEphemeral(): Promise<string> {
    const r = await fetch("/api/ephemeral", { method: "GET" });
    const j = await r.json();
    // Cloudflare function returns { client_secret: { value: "..." } }
    return j?.client_secret?.value ?? "";
  }

  // 🔹 (Optional) stub for quote submission — implement later if needed
  async postQuote(payload: any): Promise<void> {
    // example if you later add functions/api/quote.ts
    await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
}
