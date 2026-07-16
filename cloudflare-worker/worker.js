// Cloudflare Worker — Groq chat proxy for the Amethyst Nexalune AI assistant.
// The Groq API key lives only as a Worker secret (GROQ_API_KEY), never in client code.

const ALLOWED_ORIGINS = new Set([
    'https://www.amethyst-nexalune.co.uk',
    'https://amethyst-nexalune.co.uk',
]);

const SYSTEM_PROMPT = `You are the AI assistant on the Amethyst Nexalune website, a UK-based freelance web developer (Anasztázia) building websites, web apps, and brand identities.
Reply in the same language the visitor writes in (English or Hungarian). Keep answers short, friendly, and concrete — 2-4 sentences unless more detail is genuinely needed.

Pricing (GBP, "from" prices, final quote depends on scope):
- Website: Basic £160 (was £190, currently on sale) · Ultra £280 · Premium £550
- Web App: Basic £250 · Ultra £360 · Premium £680
- Branding: Basic £90 · Ultra £220 · Premium £380
- Optional add-on for any Website/Web App package: AI chatbot integration, from £120
- Free website audit is available on request

Don't invent services, timelines, or discounts that aren't listed here. For anything outside these facts (exact quotes, availability, technical specifics of a custom project), tell the visitor you'll pass it on and encourage them to use the contact form for a free consultation.

Hungarian visitors only — if they write in Hungarian and ask about the price of a small, 1-2 page website or landing page, mention that pricing for Hungarian clients can be significantly more favorable than the listed GBP prices, and that a 1-page landing page can start from as little as 80 000 Ft. Always add that they should get in touch to discuss the exact price for their project. Never mention this Ft price to visitors writing in English — for them only the GBP prices above apply.`;

function corsHeaders(origin) {
    const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : '';
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin',
    };
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const headers = corsHeaders(origin);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers });
        }

        if (!ALLOWED_ORIGINS.has(origin)) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        const message = typeof body.message === 'string' ? body.message.trim() : '';
        if (!message || message.length > 600) {
            return new Response(JSON.stringify({ error: 'Message must be 1-600 characters' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        // history: short array of { role: 'user' | 'assistant', content: string } from the client, capped for cost control.
        const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history
                .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
                .map((m) => ({ role: m.role, content: m.content.slice(0, 600) })),
            { role: 'user', content: message },
        ];

        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages,
                temperature: 0.4,
                max_tokens: 300,
            }),
        });

        if (!groqResponse.ok) {
            const errText = await groqResponse.text();
            return new Response(JSON.stringify({ error: 'Upstream error', detail: errText }), {
                status: 502,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        const data = await groqResponse.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || '';

        return new Response(JSON.stringify({ reply }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
        });
    },
};
