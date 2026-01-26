"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/router";

/**
 * WeeklyInsightsModal - Shows 3 slides + finish slide in carousel format
 * 
 * This component displays weekly insights slides that are shared across all profiles
 * with the same artist_id. For example, if artist_id "10" has slides, all users
 * with artist_id "10" (Hardi, Michael, etc.) will see the same slides.
 * 
 * Props:
 * - open: boolean - whether modal is visible
 * - onClose: function - called when modal closes
 * - artistId: string - the artist_id (e.g., "10", "8", etc.)
 * - profileId: string - the logged-in user's profile UUID (for tracking views)
 * - weekStartDate: string - ISO date (YYYY-MM-DD) of the Monday
 * - isAutoPopup: boolean - if true, shows 4 slides (with finish slide), if false shows 3 slides only
 */
export default function WeeklyInsightsModal({ 
  open, 
  onClose, 
  artistId, 
  profileId,
  weekStartDate,
  isAutoPopup = false 
}) {
  const router = useRouter();
  
  // State for slides
  const [slides, setSlides] = useState([]); // Array of { url, path }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Carousel state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  
  // Mark as viewed when modal opens (for auto-popup only)
  useEffect(() => {
    if (!open || !isAutoPopup || !profileId || !artistId || !weekStartDate) return;
    
    // Mark as viewed immediately when modal opens
    async function markViewed() {
      try {
        await supabase
          .from("weekly_insights_views")
          .insert({
            profile_id: profileId,
            artist_id: artistId,
            week_start_date: weekStartDate
          });
        console.log("✅ Marked week as viewed");
      } catch (err) {
        // Ignore duplicate key errors (already viewed)
        console.log("Already marked as viewed or error:", err);
      }
    }
    
    markViewed();
  }, [open, isAutoPopup, profileId, artistId, weekStartDate]);
  
  // Load slides from database and storage
  useEffect(() => {
    if (!open || !artistId || !weekStartDate) return;
    
    async function loadSlides() {
      try {
        setLoading(true);
        setError("");
        
        console.log("🎯 Loading slides for:", { artistId, weekStartDate });
        
        // Get the weekly insights record for this artist_id and week
        const { data: insightData, error: insightError } = await supabase
          .from("weekly_insights")
          .select("slide_paths")
          .eq("artist_id", artistId)
          .eq("week_start_date", weekStartDate)
          .single();
        
        if (insightError) {
          console.error("❌ Database error:", insightError);
          throw insightError;
        }
        
        console.log("📊 Database result:", insightData);
        
        if (!insightData || !insightData.slide_paths || insightData.slide_paths.length === 0) {
          console.log("⚠️ No slides found");
          setSlides([]);
          setLoading(false);
          return;
        }
        
        console.log("📁 Slide paths:", insightData.slide_paths);
        
        // Get public URLs for all slides with image transformation for optimization
        const slideUrls = insightData.slide_paths.map(path => {
          const { data } = supabase.storage
            .from("weekly-insights")
            .getPublicUrl(path, {
              transform: {
                width: 1080,
                quality: 90,
                format: 'origin' // Try original format first to debug
              }
            });
          
          console.log("🔗 Generated URL for path:", path, "→", data.publicUrl);
          
          return {
            url: data.publicUrl,
            path: path
          };
        });
        
        setSlides(slideUrls);
        setCurrentIndex(0);
        console.log("✅ Loaded", slideUrls.length, "slides");
      } catch (err) {
        console.error("❌ Failed to load weekly insights:", err);
        setError(err.message || "Failed to load slides");
      } finally {
        setLoading(false);
      }
    }
    
    loadSlides();
  }, [open, artistId, weekStartDate]);
  
  // Don't render if not open
  if (!open) return null;
  
  // Close handler
  function handleClose() {
    setCurrentIndex(0);
    onClose();
  }
  
  // Navigation functions
  const totalSlides = isAutoPopup ? slides.length + 1 : slides.length; // +1 for finish slide if auto-popup
  
  function goNext() {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }
  
  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }
  
  // Touch handlers for swipe
  function handleTouchStart(e) {
    setTouchStartX(e.touches[0].clientX);
  }
  
  function handleTouchEnd(e) {
    if (touchStartX === null) return;
    
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    
    // Swipe threshold: 50px
    if (deltaX > 50) {
      goPrev(); // Swiped right = go to previous
    } else if (deltaX < -50) {
      goNext(); // Swiped left = go to next
    }
    
    setTouchStartX(null);
  }
  
  // Navigate to calendar
  function handleGoToCalendar() {
    handleClose();
    router.push("/dashboard/artist/artist-calendar");
  }
  
  // Determine if we're on the finish slide
  const isFinishSlide = isAutoPopup && currentIndex === slides.length;
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]"
      onClick={handleClose}
    >
      <div 
        className="relative bg-white rounded-2xl w-[95vw] max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
        >
          ✕
        </button>
        
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-gray-600">Loading slides...</div>
          </div>
        )}
        
        {/* Error state */}
        {!loading && error && (
          <div className="flex items-center justify-center min-h-[600px] p-6">
            <div className="text-center">
              <div className="text-red-600 mb-2">Failed to load slides</div>
              <div className="text-sm text-gray-600">{error}</div>
            </div>
          </div>
        )}
        
        {/* No slides available */}
        {!loading && !error && slides.length === 0 && (
          <div className="flex items-center justify-center min-h-[600px] p-6">
            <div className="text-center text-gray-600">
              No slides available for this week yet. Check back soon!
            </div>
          </div>
        )}
        
        {/* Slides carousel */}
        {!loading && !error && slides.length > 0 && (
          <div
            className="relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Slide content */}
            <div className="relative" style={{ aspectRatio: '3/4' }}>
              {isFinishSlide ? (
                // Finish slide (4th slide for auto-popup) - UPDATED STYLING
                <div className="w-full h-full flex flex-col items-center justify-center artist-panel p-8">
                  <div className="text-center space-y-6 max-w-sm">
                    <div className="text-5xl mb-4">🎉</div>
                    
                    <h2 className="text-2xl font-bold text-[#33296b]">
                      You've finished "What Happened?"
                    </h2>
                    
                    <p className="text-base text-gray-700">
                      for this week!
                    </p>
                    
                    <button
                      onClick={handleGoToCalendar}
                      className="w-full mt-6 px-6 py-3 rounded-xl font-semibold transition"
                      style={{ backgroundColor: "#599b40", color: "#33296b" }}
                    >
                      Check out the newly uploaded posts
                    </button>
                    
                    <p className="text-sm text-gray-600 mt-4">
                      Check in next Monday for the next "What Happened?"
                    </p>
                  </div>
                </div>
              ) : (
                // Regular slide (image)
                <img
                  src={slides[currentIndex]?.url}
                  alt={`Slide ${currentIndex + 1}`}
                  className="w-full h-full object-cover"
                  onLoad={() => console.log("✅ Image loaded:", slides[currentIndex]?.path)}
                  onError={(e) => {
                    console.error("❌ Image failed to load:", slides[currentIndex]?.path);
                    console.error("Image URL:", slides[currentIndex]?.url);
                    console.error("Error event:", e);
                  }}
                />
              )}
            </div>
            
            {/* Navigation arrows (only show if more than 1 total slide) */}
            {totalSlides > 1 && (
              <>
                {currentIndex > 0 && (
                  <button
                    onClick={goPrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition text-xl"
                  >
                    ‹
                  </button>
                )}
                
                {currentIndex < totalSlides - 1 && (
                  <button
                    onClick={goNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition text-xl"
                  >
                    ›
                  </button>
                )}
              </>
            )}
            
            {/* Dot indicators */}
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition ${
                    idx === currentIndex
                      ? 'bg-white w-6'
                      : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}