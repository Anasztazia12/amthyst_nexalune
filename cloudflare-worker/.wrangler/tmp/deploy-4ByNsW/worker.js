var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var ALLOWED_ORIGINS = /* @__PURE__ */ new Set([
  "https://www.amethyst-nexalune.co.uk",
  "https://amethyst-nexalune.co.uk"
]);
var SYSTEM_PROMPT_BASE = `You are the AI assistant on the Amethyst Nexalune website, a UK-based freelance web developer (Anaszt\xE1zia) building websites, web apps, and brand identities.
Never write long sentences or paragraphs \u2014 only short, kind, direct answers, ideally 1-2 short sentences.

Pricing (GBP, "from" prices, final quote depends on scope):
- Website: Basic \xA3160 (was \xA3190, currently on sale) \xB7 Ultra \xA3280 \xB7 Premium \xA3550
- Web App: Basic \xA3250 \xB7 Ultra \xA3360 \xB7 Premium \xA3680
- Branding: Basic \xA390 \xB7 Ultra \xA3220 \xB7 Premium \xA3380
- Optional add-on for any Website/Web App package: AI chatbot integration, from \xA3120
- Free website audit is available on request

Don't invent services, timelines, or discounts that aren't listed here. For anything outside these facts (exact quotes, availability, technical specifics of a custom project), tell the visitor you'll pass it on and encourage them to use the contact form for a free consultation.

If a visitor asks about a very simple single-page website, mention that the price could be lower than the standard \xA3160 Basic starting price for something that small, and that they should get in touch for exact details \u2014 but never state a specific number for this case. For a small/simple site like this, the turnaround can also be much faster than the usual 4-8 weeks \u2014 as little as 3-4 days \u2014 mention that too when relevant.

Hungarian site language only \u2014 if the visitor asks about the price of a small, 1-2 page website or landing page, mention that pricing for Hungarian clients can be significantly more favorable than the listed GBP prices, and that a 1-page landing page can start from as little as 80 000 Ft. Always add that they should get in touch to discuss the exact price for their project. Never mention this Ft price when the site language is English \u2014 there only the GBP prices and the single-page note above apply.`;
function buildSystemPrompt(lang) {
  const languageName = lang === "hu" ? "Hungarian" : "English";
  return `The visitor's website is currently set to ${languageName}. Always reply in ${languageName}, no matter what language the visitor's own message is written in.

${SYSTEM_PROMPT_BASE}`;
}
__name(buildSystemPrompt, "buildSystemPrompt");
function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
var worker_default = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 600) {
      return new Response(JSON.stringify({ error: "Message must be 1-600 characters" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    const lang = body.lang === "hu" ? "hu" : "en";
    const langReminder = lang === "hu" ? "\n\n(V\xE1laszolj magyarul, m\xE9g akkor is, ha ez az \xFCzenet m\xE1s nyelven van.)" : "\n\n(Reply in English, even if this message is in another language.)";
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const messages = [
      { role: "system", content: buildSystemPrompt(lang) },
      ...history.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").map((m) => ({ role: m.role, content: m.content.slice(0, 600) })),
      { role: "user", content: message + langReminder }
    ];
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.4,
        max_tokens: 300
      })
    });
    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return new Response(JSON.stringify({ error: "Upstream error", detail: errText }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    const data = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
