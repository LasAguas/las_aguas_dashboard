// pages/api/metrics/instagram-single.js
// Fetch Instagram metrics for a single post

import { createClient } from "@supabase/supabase-js";

// Create Supabase admin client (service role key - bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * API Route: Fetch Instagram stats for a single post
 * 
 * Query params:
 *   - postId: The post ID to fetch stats for
 *   - secret: CRON_SECRET for authentication
 * 
 * Returns:
 *   - { ok: true, post_id, message, metrics } on success
 *   - { ok: false, error, details } on failure
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check CRON_SECRET for security
  const { secret, postId } = req.query;
  
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!postId) {
    return res.status(400).json({ error: "postId query parameter is required" });
  }

  try {
    // 1) Fetch the specific post with its artist data
    const { data: post, error: postError } = await supabaseAdmin
      .from("posts")
      .select(`
        *,
        artists (
          id,
          name,
          facebook_page_id
        )
      `)
      .eq("id", postId)
      .single();

    if (postError) {
      console.error("Error fetching post:", postError);
      return res.status(500).json({ 
        ok: false, 
        error: "Failed to fetch post data",
        details: postError.message 
      });
    }

    if (!post) {
      return res.status(404).json({ 
        ok: false, 
        error: "Post not found" 
      });
    }

    // Check if post is marked as 'posted'
    if (post.status !== "posted") {
      return res.status(400).json({ 
        ok: false, 
        error: `Post status is '${post.status}', must be 'posted'` 
      });
    }

    // Check if post has Instagram URL
    if (!post.instagram_url) {
      return res.status(400).json({ 
        ok: false, 
        error: "Post has no instagram_url set" 
      });
    }

    // Check if artist has Facebook Page ID
    if (!post.artists?.facebook_page_id) {
      return res.status(400).json({ 
        ok: false, 
        error: "Artist has no facebook_page_id configured" 
      });
    }

    // 2) Get the artist's Instagram access token
    const { data: authRow, error: authError } = await supabaseAdmin
      .from("artist_social_auth_status")
      .select("access_token, status")
      .eq("artist_id", post.artist_id)
      .eq("platform", "instagram")
      .single();

    if (authError || !authRow) {
      return res.status(400).json({ 
        ok: false, 
        error: "No Instagram auth found for this artist",
        details: authError?.message 
      });
    }

    if (authRow.status !== "ok") {
      return res.status(400).json({ 
        ok: false, 
        error: `Instagram auth status is '${authRow.status}', not 'ok'. Please refresh the token.` 
      });
    }

    const accessToken = authRow.access_token;
    const pageId = post.artists.facebook_page_id;
    const postUrl = post.instagram_url;

    // Helper function to normalize URLs (remove trailing slashes)
    function normalizeUrl(url) {
      try {
        const u = new URL(url);
        u.pathname = u.pathname.replace(/\/+$/, "");
        return u.toString();
      } catch {
        return url;
      }
    }

    const normalizedPostUrl = normalizeUrl(postUrl);

    // 3) Get the Instagram Business Account ID from the Facebook Page
    console.log(`Fetching IG account for Page ID: ${pageId}`);
    const pageResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
    );
    const pageData = await pageResponse.json();

    if (!pageResponse.ok) {
      console.error("Facebook Page API error:", pageData);
      return res.status(400).json({ 
        ok: false, 
        error: "Failed to fetch Facebook Page data",
        details: pageData.error?.message || JSON.stringify(pageData)
      });
    }

    if (!pageData.instagram_business_account) {
      return res.status(400).json({ 
        ok: false, 
        error: "Facebook Page is not linked to an Instagram Business Account",
        hint: "Connect the Page to an IG Business Account in Facebook settings"
      });
    }

    const igAccountId = pageData.instagram_business_account.id;
    console.log(`Found IG account ID: ${igAccountId}`);

    // 4) Search for the Instagram media by permalink
    console.log(`Searching for media with permalink: ${normalizedPostUrl}`);
    
    let mediaUrl = `https://graph.facebook.com/v21.0/${igAccountId}/media?fields=id,permalink,media_type,media_product_type,like_count,comments_count&limit=100&access_token=${accessToken}`;
    let matchingMedia = null;
    let pagesChecked = 0;
    const MAX_PAGES = 5;

    // Paginate through media to find the matching permalink
    while (mediaUrl && pagesChecked < MAX_PAGES && !matchingMedia) {
      const mediaResponse = await fetch(mediaUrl);
      const mediaData = await mediaResponse.json();

      if (!mediaResponse.ok) {
        console.error("Instagram media API error:", mediaData);
        return res.status(400).json({ 
          ok: false, 
          error: "Failed to fetch Instagram media list",
          details: mediaData.error?.message || JSON.stringify(mediaData)
        });
      }

      const mediaList = mediaData.data || [];
      console.log(`Checking ${mediaList.length} media items (page ${pagesChecked + 1})`);

      // Look for matching permalink
      for (const media of mediaList) {
        if (media.permalink) {
          const normalizedMediaPermalink = normalizeUrl(media.permalink);
          if (normalizedMediaPermalink === normalizedPostUrl) {
            matchingMedia = media;
            console.log(`Found matching media: ${media.id}`);
            break;
          }
        }
      }

      pagesChecked++;
      mediaUrl = mediaData.paging?.next || null;
    }

    if (!matchingMedia) {
      return res.status(404).json({ 
        ok: false, 
        error: "No matching Instagram media found for this URL",
        hint: "Make sure the instagram_url exactly matches the post permalink (e.g., https://www.instagram.com/p/ABC123/)"
      });
    }

    const mediaId = matchingMedia.id;
    const mediaType = matchingMedia.media_type;
    const mediaProductType = matchingMedia.media_product_type;

    console.log(`Media type: ${mediaType}, Product type: ${mediaProductType}`);

    // 5) Fetch insights for this media
    // Try different metric combinations since some metrics aren't supported for all media types
    const metricAttempts = [
      ["views", "reach", "saved", "shares"],  // Most comprehensive
      ["views", "reach"],                      // Basic metrics
      ["reach"],                               // Fallback
    ];

    let insightsData = null;
    let lastError = null;

    for (const metrics of metricAttempts) {
      const insightsUrl = `https://graph.facebook.com/v21.0/${mediaId}/insights?metric=${metrics.join(",")}&access_token=${accessToken}`;
      
      console.log(`Trying metrics: ${metrics.join(", ")}`);
      const insightsResponse = await fetch(insightsUrl);
      const data = await insightsResponse.json();

      if (insightsResponse.ok) {
        insightsData = data;
        console.log(`Successfully fetched insights with metrics: ${metrics.join(", ")}`);
        break;
      } else {
        lastError = data;
        const errorMsg = data.error?.message || "";
        const errorCode = data.error?.code;
        
        // Check if it's an unsupported metric error
        const isUnsupportedMetric = 
          errorCode === 100 && 
          (errorMsg.includes("not supported") || errorMsg.includes("no longer supported"));
        
        if (isUnsupportedMetric) {
          console.log(`Metrics not supported, trying next combination...`);
          continue;
        } else {
          // It's a different error (auth/permissions), stop trying
          console.error("Instagram insights API error:", data);
          break;
        }
      }
    }

    if (!insightsData) {
      return res.status(400).json({ 
        ok: false, 
        error: "Failed to fetch Instagram insights",
        details: lastError?.error?.message || "All metric combinations failed"
      });
    }

    // Parse insights into a metrics object
    const metricsArray = insightsData.data || [];
    const metricsMap = {};
    
    for (const item of metricsArray) {
      const metricName = item.name;
      const metricValue = item.values?.[0]?.value;
      metricsMap[metricName] = metricValue ?? null;
    }

    console.log("Fetched metrics:", metricsMap);

    // Get likes and comments from the media object (not insights)
    const likes = matchingMedia.like_count ?? null;
    const comments = matchingMedia.comments_count ?? null;

    // 6) Build and insert snapshot
    const snapshot = {
      post_id: post.id,
      platform: "instagram",
      snapshot_at: new Date().toISOString(),
      
      // Metrics from insights
      views: metricsMap.views ?? null,
      reach: metricsMap.reach ?? null,
      saves: metricsMap.saved ?? null,
      shares: metricsMap.shares ?? null,
      reposts: metricsMap.reposts ?? null,
      
      // Metrics from media object
      likes: likes,
      comments: comments,
      
      // Calculate simple engagement score
      ig_score: (likes || 0) * 1 + (comments || 0) * 2 + (metricsMap.saved || 0) * 3 + (metricsMap.shares || 0) * 3,
      
      // Store raw data for debugging
      raw_metrics: {
        media: matchingMedia,
        insights: metricsMap,
      }
    };

    const { error: insertError } = await supabaseAdmin
      .from("post_metrics_snapshots")
      .insert(snapshot);

    if (insertError) {
      console.error("Error inserting snapshot:", insertError);
      return res.status(500).json({ 
        ok: false, 
        error: "Failed to save metrics to database",
        details: insertError.message 
      });
    }

    console.log(`✅ Successfully saved metrics for post ${post.id}`);

    // Success!
    return res.status(200).json({ 
      ok: true, 
      post_id: post.id,
      post_name: post.post_name,
      message: "Instagram stats fetched successfully",
      metrics: {
        views: snapshot.views,
        reach: snapshot.reach,
        likes: snapshot.likes,
        comments: snapshot.comments,
        saves: snapshot.saves,
        shares: snapshot.shares,
      }
    });

  } catch (error) {
    console.error("Unexpected error in instagram-single:", error);
    return res.status(500).json({ 
      ok: false, 
      error: "Internal server error",
      details: error.message 
    });
  }
}