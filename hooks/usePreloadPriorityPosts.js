import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Cache for signed URLs (shared across all components)
const mediaUrlCache = new Map();

// Helper: Get cached URL or null if expired
function cacheGetUrl(path) {
  const v = mediaUrlCache.get(path);
  if (!v) return null;
  
  if (v.expires && v.expires <= Date.now()) {
    mediaUrlCache.delete(path);
    return null;
  }
  
  return v.url || null;
}

// Helper: Cache URL with expiration
function cacheSetUrl(path, url, expiresAt) {
  mediaUrlCache.set(path, { url, expires: expiresAt });
}

// Helper: Get optimized media URL
async function getOptimizedMediaUrl(path, options = {}) {
  const now = Date.now();
  const cacheKey = options.fullSize ? `${path}:full` : path;

  if (cacheGetUrl(cacheKey)) {
    return cacheGetUrl(cacheKey);
  }

  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(path);
  
  const transformOptions = isImage && !options.fullSize ? {
    transform: {
      width: 1200,
      height: 1200,
      quality: 85,
      format: 'webp'
    }
  } : undefined;

  const { data, error } = await supabase.storage
    .from("post-variations")
    .createSignedUrl(path, 604800, transformOptions);

  if (error) throw error;

  cacheSetUrl(cacheKey, data.signedUrl, now + 604800 * 1000);
  return data.signedUrl;
}

// Helper: Preload media with smart strategies
async function preloadMedia(url) {
  if (!url || typeof window === 'undefined') return;
  
  const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(url);
  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(url);
  
  if (isVideo) {
    // Check connection speed
    const connection = navigator.connection || navigator.mozConnection;
    const effectiveType = connection?.effectiveType || '4g';
    const downlink = connection?.downlink || 10;
    
    const isFastConnection = effectiveType === '4g' || downlink > 5;
    
    // First 3 seconds = ~3MB (reasonable to preload)
    const bytesToPreload = 3 * 1024 * 1024;
    
    try {
      if (isFastConnection) {
        // FULL VIDEO PRELOAD (on fast connections)
        const video = document.createElement('video');
        video.muted = true;
        video.preload = 'auto';
        video.src = url;
        video.load();
        
        console.log(`🎥 Preloading FULL video (fast connection):`, url.split('/').pop());
      } else {
        // PARTIAL PRELOAD: First 3 seconds
        const response = await fetch(url, {
          headers: {
            'Range': `bytes=0-${bytesToPreload - 1}`
          }
        });
        
        if (response.ok || response.status === 206) {
          console.log(`🎥 Preloaded FIRST 3 SECONDS (${(bytesToPreload / 1024 / 1024).toFixed(1)}MB):`, url.split('/').pop());
        }
      }
    } catch (err) {
      // Fallback: metadata-only
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';
      video.src = url;
      video.load();
      
      console.log(`🎥 Preloading metadata only (fallback):`, url.split('/').pop());
    }
  } else if (isImage) {
    // Images: Always preload fully
    const img = new Image();
    img.src = url;
    
    console.log(`🖼️  Preloading image:`, url.split('/').pop());
  }
}

export default function usePreloadPriorityPosts(artistId) {
  const [status, setStatus] = useState({
    loading: false,
    completed: 0,
    total: 0,
    error: null,
    bytesDownloaded: 0
  });

  useEffect(() => {
    if (!artistId || typeof window === 'undefined') return;

    let cancelled = false;

    async function preloadPriorityPosts() {
      try {
        setStatus({ loading: true, completed: 0, total: 0, error: null, bytesDownloaded: 0 });

        const today = new Date().toISOString().slice(0, 10);
        const tenDaysLater = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select(`
            id,
            post_name,
            post_date,
            status,
            postvariations (
              id,
              file_name,
              test_version,
              carousel_files
            )
          `)
          .eq('artist_id', artistId)
          .in('status', ['ready', 'uploaded'])
          .gte('post_date', today)
          .lte('post_date', tenDaysLater)
          .order('post_date', { ascending: true })
          .limit(3);

        if (postsError) throw postsError;
        if (cancelled) return;

        const priorityPosts = posts || [];
        
        if (priorityPosts.length === 0) {
          setStatus({ loading: false, completed: 0, total: 0, error: null, bytesDownloaded: 0 });
          console.log('📭 No priority posts to preload');
          return;
        }

        setStatus(s => ({ ...s, total: priorityPosts.length }));

        console.log(`🎯 Preloading ${priorityPosts.length} priority posts...`);

        let totalBytes = 0;

        for (let i = 0; i < priorityPosts.length; i++) {
          if (cancelled) break;

          const post = priorityPosts[i];
          const variations = post.postvariations || [];
          
          if (variations.length === 0) continue;

          const firstVariation = variations.sort((a, b) => 
            (a.test_version || 0) - (b.test_version || 0)
          )[0];

          let firstMediaPath = null;
          
          if (firstVariation.carousel_files?.length > 0) {
            firstMediaPath = firstVariation.carousel_files[0];
          } else if (firstVariation.file_name) {
            firstMediaPath = firstVariation.file_name;
          }

          if (!firstMediaPath) continue;

          try {
            const url = await getOptimizedMediaUrl(firstMediaPath);
            await preloadMedia(url);
            
            const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(firstMediaPath);
            const estimatedBytes = isVideo ? 3 * 1024 * 1024 : 400 * 1024;
            totalBytes += estimatedBytes;
            
            console.log(`✅ Preloaded: ${post.post_name} (${firstMediaPath.split('/').pop()})`);
          } catch (err) {
            console.warn(`⚠️  Failed to preload ${post.post_name}:`, err.message);
          }

          if (!cancelled) {
            setStatus(s => ({ 
              ...s, 
              completed: i + 1,
              bytesDownloaded: totalBytes
            }));
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!cancelled) {
          setStatus({ 
            loading: false, 
            completed: priorityPosts.length, 
            total: priorityPosts.length, 
            error: null,
            bytesDownloaded: totalBytes
          });
          console.log(`🎉 Preloading complete! ${priorityPosts.length} posts ready (${(totalBytes / 1024 / 1024).toFixed(1)}MB downloaded)`);
        }

      } catch (err) {
        console.error('❌ Preloading error:', err);
        if (!cancelled) {
          setStatus({ 
            loading: false, 
            completed: 0, 
            total: 0, 
            error: err.message,
            bytesDownloaded: 0
          });
        }
      }
    }

    const timer = setTimeout(() => {
      preloadPriorityPosts();
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [artistId]);

  return status;
}

export { cacheGetUrl, cacheSetUrl, mediaUrlCache };