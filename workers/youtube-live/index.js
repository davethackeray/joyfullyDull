/**
 * Cloudflare Worker — YouTube Live Status Checker
 *
 * Pings the YouTube Data API v3 every request (with 3-min caching)
 * to check if the channel is currently live streaming.
 *
 * Environment variables (set as Worker secrets):
 *   YOUTUBE_API_KEY      — YouTube Data API v3 key
 *   YOUTUBE_CHANNEL_ID   — The channel ID to monitor
 *
 * Returns JSON: { isLive: boolean, videoId: string | null }
 */

const CACHE_TTL = 180; // 3 minutes in seconds

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }

        const cacheKey = `live-status-${env.YOUTUBE_CHANNEL_ID}`;
        const cache = caches.default;

        // Try cache first
        const cacheUrl = new URL(request.url);
        cacheUrl.pathname = `/${cacheKey}`;
        const cachedResponse = await cache.match(new Request(cacheUrl));
        if (cachedResponse) {
            return addCors(cachedResponse);
        }

        // Fetch from YouTube Data API
        const apiUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        apiUrl.searchParams.set('part', 'snippet');
        apiUrl.searchParams.set('channelId', env.YOUTUBE_CHANNEL_ID);
        apiUrl.searchParams.set('eventType', 'live');
        apiUrl.searchParams.set('type', 'video');
        apiUrl.searchParams.set('key', env.YOUTUBE_API_KEY);

        try {
            const ytRes = await fetch(apiUrl.toString());
            const data = await ytRes.json();

            const items = data.items || [];
            const isLive = items.length > 0;
            const videoId = isLive ? items[0].id.videoId : null;

            const body = JSON.stringify({ isLive, videoId });
            const response = new Response(body, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': `s-maxage=${CACHE_TTL}`,
                    ...corsHeaders(),
                },
            });

            // Store in edge cache
            const cacheResponse = response.clone();
            await cache.put(new Request(cacheUrl), cacheResponse);

            return response;
        } catch (err) {
            return new Response(
                JSON.stringify({ isLive: false, videoId: null, error: 'API error' }),
                { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
            );
        }
    },
};

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

function addCors(response) {
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));
    return new Response(response.body, { status: response.status, headers });
}
