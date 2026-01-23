import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract query parameters from URL
  const { artistId, from, to } = req.query;
  
  // Validate required parameters
  if (!artistId) {
    return res.status(400).json({ error: 'artistId is required' });
  }
  
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to dates are required' });
  }
  
  try {
    // 🔍 DEBUG: Log incoming parameters
    console.log('🔍 API /calendar/posts called with:', {
      artistId,
      artistIdType: typeof artistId,
      artistIdAsNumber: Number(artistId),
      from,
      to
    });

    // Fetch posts from database (same query as your current code)
    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select('id, post_name, post_date, status, artist_id')
      .eq('artist_id', Number(artistId))
      .gte('post_date', from)
      .lte('post_date', to)
      .order('post_date', { ascending: true });

    // 🔍 DEBUG: Log query result
    console.log('🔍 API /calendar/posts result:', {
      postsFound: posts?.length || 0,
      hasError: !!error,
      errorMessage: error?.message || null
    });

    if (posts && posts.length > 0) {
      console.log('🔍 First post sample:', posts[0]);
    }

    if (error) throw error;

    // Set cache headers for better performance
    // This tells the browser and CDN to cache for 1 minute
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    
    // Return the posts
    return res.status(200).json({ posts: posts || [] });
    
  } catch (error) {
    console.error('API error fetching posts:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch posts',
      details: error.message 
    });
  }
}