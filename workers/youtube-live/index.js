/**
 * Cloudflare Worker — YouTube Live Status Check
 *
 * Returns { isLive: boolean, videoUrl: string } with a 5-minute edge cache
 * to protect YouTube API quota. Secrets YOUTUBE_API_KEY and
 * YOUTUBE_CHANNEL_ID must be set via `wrangler secret put`.
 */
export default {
    async fetch(request, env, ctx) {
        // 1. CORS headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Content-Type": "application/json"
        };

        // Handle preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // 2. Caching — check edge cache first
        const cacheUrl = new URL(request.url);
        const cacheKey = new Request(cacheUrl.toString(), request);
        const cache = caches.default;
        let response = await cache.match(cacheKey);

        if (!response) {
            // 3. Fetch fresh data from YouTube
            console.log("Fetching fresh data from YouTube API...");

            const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${env.YOUTUBE_CHANNEL_ID}&type=video&eventType=live&key=${env.YOUTUBE_API_KEY}`;

            try {
                const ytReq = await fetch(ytUrl);
                const ytData = await ytReq.json();

                let isLive = false;
                let videoUrl = "https://youtube.com/@JoyfullyDull";

                if (ytData.items && ytData.items.length > 0) {
                    isLive = true;
                    videoUrl = `https://www.youtube.com/watch?v=${ytData.items[0].id.videoId}`;
                }

                const responseData = JSON.stringify({ isLive, videoUrl });

                // 4. Cache for 5 minutes (300 seconds)
                response = new Response(responseData, {
                    headers: {
                        ...corsHeaders,
                        "Cache-Control": "s-maxage=300",
                    }
                });

                // Store in cache in the background
                ctx.waitUntil(cache.put(cacheKey, response.clone()));

            } catch (error) {
                // Fail gracefully — button stays hidden
                return new Response(
                    JSON.stringify({ isLive: false, videoUrl: "https://youtube.com/@JoyfullyDull", error: "Failed to fetch" }),
                    { headers: corsHeaders }
                );
            }
        }

        return response;
    },
};
