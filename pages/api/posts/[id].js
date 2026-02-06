import { supabaseAdmin } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract post ID from URL
  // If URL is /api/posts/123, then req.query.id = "123"
  const { id } = req.query;
  
  // Validate post ID
  if (!id) {
    return res.status(400).json({ error: 'Post ID is required' });
  }
  
  try {
    // Fetch post with variations using Supabase join
    // This is the same query as your openPostDetails function
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        postvariations (
          id,
          platforms,
          test_version,
          file_name,
          length_seconds,
          feedback,
          feedback_resolved,
          greenlight,
          audio_file_name,
          audio_start_seconds,
          audio_snippet_duration,
          carousel_files
        )
      `)
      .eq('id', id)
      .order('test_version', { 
        foreignTable: 'postvariations',
        ascending: true 
      })
      .single();

    if (error) {
      // Handle "not found" separately
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Post not found' });
      }
      throw error;
    }

    // Set cache headers
    // Cache for 5 minutes (posts don't change frequently)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    // Return the post with variations
    return res.status(200).json({ post });
    
  } catch (error) {
    console.error('API error fetching post:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch post',
      details: error.message 
    });
  }
}