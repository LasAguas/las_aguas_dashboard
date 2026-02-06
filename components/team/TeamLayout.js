"use client";

import { useEffect, useState } from "react";
import TeamNav from "./TeamNav";

export default function TeamLayout({ children, title, forceDesktopOpen = false }) {
  const [desktopOpen, setDesktopOpen] = useState(true);

  useEffect(() => {
    setDesktopOpen(true);
  }, []);

  return (
    <div className="min-h-screen artist-page">
      <div className="flex">
        <TeamNav
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
