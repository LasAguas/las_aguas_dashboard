// pages/api/deleteVariation.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://gtccctajvobfvhlonaot.supabase.co', // <-- comma here
    '***REMOVED***' // safer than hardcoding
  );

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path, variationId } = req.body || {};
  if (!path || !variationId) {
    return res.status(400).json({ error: 'Missing path or variationId' });
  }

  try {
    // 1) Try to delete the storage object
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('post-variations')
      .remove([path]); // path like "artist_id/post_id/filename.ext"

    // If the file wasn't found (404) we can still continue to delete the row
    if (storageError && storageError.statusCode !== '404' && storageError.message !== 'Object not found') {
      return res.status(500).json({ error: `Storage delete failed: ${storageError.message}` });
    }

    // 2) Delete the DB row
    const { error: dbError } = await supabaseAdmin
      .from('postvariations')
      .delete()
      .eq('id', variationId);

    if (dbError) {
      return res.status(500).json({ error: `DB delete failed: ${dbError.message}` });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
