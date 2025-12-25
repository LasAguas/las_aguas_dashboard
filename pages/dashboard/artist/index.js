"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ArtistIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/artist/home");
  }, [router]);
  return null;
}
