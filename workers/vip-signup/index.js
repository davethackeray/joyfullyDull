/**
 * Cloudflare Worker — VIP Signup (Supabase Proxy)
 *
 * Accepts POST { name, email, joy } and inserts into the Supabase
 * `vip_signups` table via the Supabase REST API.
 *
 * Environment variables (set as Worker secrets):
 *   SUPABASE_URL              — e.g. https://abc123.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service_role key (NOT anon)
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
            if (!name || !email || !joy) {
                return new Response(
                    JSON.stringify({ error: 'All fields are required: name, email, joy' }),
                    { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
                );
            }

            // Insert into Supabase
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/vip_signups`;
            const res = await fetch(supabaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify({
                    name,
                    email,
                    joy_answer: joy,
                }),
            });

            if (!res.ok) {
                const errBody = await res.text();
                // Handle duplicate email gracefully
                if (res.status === 409 || errBody.includes('duplicate')) {
                    return new Response(
                        JSON.stringify({
                            error: 'You've already pulled up a chair! Check your email.' }),
            { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
          );
                }
                return new Response(
                    JSON.stringify({ error: 'Signup failed. Please try again.' }),
                    { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
                );
            }

            return new Response(
                JSON.stringify({ ok: true, message: 'Welcome to the quiet corner.' }),
                { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
            );
        } catch (err) {
            return new Response(
                JSON.stringify({ error: 'Invalid request body.' }),
                { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
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
