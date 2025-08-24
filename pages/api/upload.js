import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { file, path } = req.body;
  const { data, error } = await supabase
    .storage
    .from('post-variations')
    .upload(path, file);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ data });
}