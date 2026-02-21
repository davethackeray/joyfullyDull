/**
 * Cloudflare Worker — VIP Signup (Cloudflare D1)
 *
 * Accepts POST { name, email, joy } and inserts into the D1
 * `vip_signups` table. No external credentials needed — D1 is
 * bound natively via wrangler.toml.
 *
 * D1 binding name: DB (configured in wrangler.toml)
 */

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json', ...corsHeaders() },
            });
        }

        try {
            const { name, email, joy } = await request.json();

            // Basic validation
            if (!name?.trim() || !email?.trim() || !joy?.trim()) {
                return new Response(
                    JSON.stringify({ error: 'All fields are required: name, email, joy' }),
                    { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
                );
            }

            // Insert into D1
            await env.DB.prepare(
                `INSERT INTO vip_signups (name, email, joy_answer) VALUES (?, ?, ?)`
            )
                .bind(name.trim(), email.trim().toLowerCase(), joy.trim())
                .run();

            return new Response(
                JSON.stringify({ ok: true, message: 'Welcome to the quiet corner.' }),
                { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
            );

        } catch (err) {
            // D1 UNIQUE constraint violation = duplicate email
            if (err.message?.includes('UNIQUE constraint failed')) {
                return new Response(
                    JSON.stringify({ error: "You've already pulled up a chair! Check your email." }),
                    { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
                );
            }

            // Invalid JSON body
            if (err instanceof SyntaxError) {
                return new Response(
                    JSON.stringify({ error: 'Invalid request body.' }),
                    { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
                );
            }

            return new Response(
                JSON.stringify({ error: 'Signup failed. Please try again.' }),
                { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
            );
        }
    },
};

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}
