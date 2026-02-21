/**
 * Cloudflare Worker — VIP Signup (Cloudflare D1 + Resend email)
 *
 * Accepts POST { name, email, joy }, inserts into D1, then fires
 * a welcome email via Resend (fire-and-forget — email failure never
 * blocks or breaks the signup).
 *
 * Bindings / secrets required:
 *   DB            — D1 database (wrangler.toml)
 *   RESEND_API_KEY — Resend API key (wrangler secret)
 */

const WELCOME_SUBJECT = 'Welcome home. The kettle is on. ☕️';

function welcomeEmail(firstName) {
    return `Hello ${firstName},

You made it. You successfully navigated away from the endless scroll, the algorithmic noise, and the pressure to optimize every single second of your existence, and you found our digital porch.

I'm Dave. My wife and I are thrilled you pulled up a chair.

We started the Eudaimonia and You society—and this Joyfully Dull rebellion—because we missed the simple art of being happily human. We wanted that Gone Fishing energy. We wanted to celebrate the quiet thrill of a well-baked loaf and a crisp morning walk, rather than constantly chasing the next big artificial high.

Since you signed the guestbook, you now have the keys to the Morning Pages.

What is that?
It's simple. A few times a week, I turn the camera on, make a brew, and just sit and write. It's an unlisted, private livestream just for this group. No shouting, no "smash the subscribe button" nonsense. Just quiet reflection, sorting through the thoughts of the day, and finding those little diamonds forged in the dullness of a normal week.

I'll email you the private YouTube link right before I go live. Your only job is to bring a beverage of your choice.

In the meantime, I'd love to hear from you. Reply directly to this email and let me know: what is the most joyfully dull thing you are looking forward to today? (I actually read these, and they are my favorite part of the day).

Raise a glass to the simple things. The good life.

See you on the stream,

Dave
Joyfully Dull`;
}

async function sendWelcomeEmail(env, name, email) {
    if (!env.RESEND_API_KEY) return; // Secret not set yet — skip silently

    const firstName = name.trim().split(' ')[0]; // Use first name only

    await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'Dave at Joyfully Dull <dave@joyfullydull.com>',
            to: [email],
            subject: WELCOME_SUBJECT,
            text: welcomeEmail(firstName),
        }),
    });
    // Fire-and-forget: we intentionally don't await or check the response.
    // Signup is already committed to D1; email failures are non-fatal.
}

export default {
    async fetch(request, env, ctx) {
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

            // Send welcome email (non-blocking — errors are swallowed)
            env.ctx?.waitUntil(sendWelcomeEmail(env, name, email.trim().toLowerCase()));

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
