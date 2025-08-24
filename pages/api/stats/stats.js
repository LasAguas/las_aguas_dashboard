// pages/api/stats/snapshots.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ must be server-side safe
)

export default async function handler(req, res) {
  const { artist_id } = req.query

  if (!artist_id) {
    return res.status(400).json({ error: 'artist_id required' })
  }

  try {
    const { data, error } = await supabase
      .from('artist_stats_snapshots')
      .select('*')
      .eq('artist_id', artist_id)
      .order('snapshot_date', { ascending: true })

    if (error) throw error

    res.status(200).json(data || [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch snapshots' })
  }
}
