import { supabase } from '../../lib/supabaseClient'

export default async function handler(req, res) {
  try {
    console.log('\n🔍 TEST: Supabase Client Configuration');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    console.log('Anon Key length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
    
    console.log('\n🔍 TEST: Can we query posts table?');
    const { data, error, status, statusText } = await supabase
      .from('posts')
      .select('*')
      .limit(5);
    
    console.log('Response:', {
      status,
      statusText,
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
      dataLength: data?.length || 0
    });

    if (data && data.length > 0) {
      console.log('✅ SUCCESS - First post:', data[0]);
    }

    console.log('\n🔍 TEST: Try other common table names');
    
    // Try with capital P
    const { data: data2, error: error2 } = await supabase
      .from('Posts')
      .select('*')
      .limit(1);
    console.log('Posts (capital P):', { found: data2?.length || 0, error: error2?.message });

    // Try profiles table (should exist in Supabase auth)
    const { data: data3, error: error3 } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    console.log('profiles table:', { found: data3?.length || 0, error: error3?.message });

    return res.status(200).json({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      postsQuery: {
        status,
        error: error?.message,
        found: data?.length || 0
      },
      capitalPosts: {
        found: data2?.length || 0
      },
      profilesTable: {
        found: data3?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
}