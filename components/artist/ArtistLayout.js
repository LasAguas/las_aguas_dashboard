"use client";

import { useEffect, useState } from "react";
import ArtistNav from "./ArtistNav";
import { getMyArtistContext } from "./artistData";
import usePreloadPriorityPosts from "../../hooks/usePreloadPriorityPosts";

export default function ArtistLayout({ children, title, forceDesktopOpen = false }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [artistId, setArtistId] = useState(null);

  // Get artist ID on mount
  useEffect(() => {
    async function loadArtistId() {
      try {
        const { artistId } = await getMyArtistContext();
        setArtistId(artistId);
      } catch (err) {
        console.error("Failed to get artist context:", err);
      }
    }
    loadArtistId();
  }, []);

  // Preload priority posts in background
  const preloadStatus = usePreloadPriorityPosts(artistId);

  useEffect(() => {
    setDesktopOpen(true);
  }, []);

  // Optional: Show preload progress in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && preloadStatus.loading) {
      console.log(`📦 Preloading: ${preloadStatus.completed}/${preloadStatus.total}`);
    }
  }, [preloadStatus]);

  return (
    <div className="min-h-screen artist-page">
      <div className="flex">
        <ArtistNav
          forceDesktopOpen={forceDesktopOpen}
          desktopOpen={desktopOpen}
          setDesktopOpen={setDesktopOpen}
        />

        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 md:py-6 pb-24 md:pb-8">
            {title && <h1 className="text-xl md:text-2xl font-semibold mb-4">{title}</h1>}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
