// pages/index.js
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Change this path if you prefer a different landing page, e.g. "/login"
    router.replace("/calendar");
  }, [router]);

  // Nothing to render – user will be redirected immediately
  return null;
}
