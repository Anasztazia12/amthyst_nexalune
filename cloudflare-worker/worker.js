// Cloudflare Worker — Groq chat proxy for the Amethyst Nexalune AI assistant.
// The Groq API key lives only as a Worker secret (GROQ_API_KEY), never in client code.

const ALLOWED_ORIGINS = new Set([
    'https://www.amethyst-nexalune.co.uk',
    'https://amethyst-nexalune.co.uk',
]);

const SYSTEM_PROMPT_BASE = `You are the AI assistant on the Amethyst Nexalune website, a UK-based freelance web developer (Anasztázia) building websites, web apps, and brand identities.
Never write long sentences or paragraphs — only short, kind, direct answers, ideally 1-2 short sentences.

Pricing (GBP, "from" prices, final quote depends on scope):
- Website: Basic £160 (was £190, currently on sale) · Ultra £280 · Premium £550
- Web App: Basic £250 · Ultra £360 · Premium £680
- Branding: Basic £90 · Ultra £220 · Premium £380
- Optional add-on for any Website/Web App package: AI chatbot integration, from £120
- Free website audit is available on request

Don't invent services, timelines, or discounts that aren't listed here. For anything outside these facts (exact quotes, availability, technical specifics of a custom project), tell the visitor you'll pass it on and encourage them to use the contact form for a free consultation.

If a visitor asks about a very simple single-page website, mention that the price could be lower than the standard £160 Basic starting price for something that small, and that they should get in touch for exact details — but never state a specific number for this case. For a small/simple site like this, the turnaround can also be much faster than the usual 4-8 weeks — as little as 3-4 days — mention that too when relevant.

Hungarian site language only — if the visitor asks about the price of a small, 1-2 page website or landing page, mention that pricing for Hungarian clients can be significantly more favorable than the listed GBP prices, and that a 1-page landing page can start from as little as 80 000 Ft. Always add that they should get in touch to discuss the exact price for their project. Never mention this Ft price when the site language is English — there only the GBP prices and the single-page note above apply.`;

function buildSystemPrompt(lang) {
    const languageName = lang === 'hu' ? 'Hungarian' : 'English';
    return `The visitor's website is currently set to ${languageName}. Always reply in ${languageName}, no matter what language the visitor's own message is written in.\n\n${SYSTEM_PROMPT_BASE}`;
}

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

        const lang = body.lang === 'hu' ? 'hu' : 'en';
        const langReminder = lang === 'hu' ? '\n\n(Válaszolj magyarul, még akkor is, ha ez az üzenet más nyelven van.)' : '\n\n(Reply in English, even if this message is in another language.)';

        // history: short array of { role: 'user' | 'assistant', content: string } from the client, capped for cost control.
        const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
        const messages = [
            { role: 'system', content: buildSystemPrompt(lang) },
            ...history
                .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
                .map((m) => ({ role: m.role, content: m.content.slice(0, 600) })),
            { role: 'user', content: message + langReminder },
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
