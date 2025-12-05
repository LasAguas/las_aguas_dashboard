"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

// --- helpers ---
const pad = (n) => String(n).padStart(2, "0");
const toYMD = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const stripTime = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday -> 7
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function MenuPage() {
  const [notifications, setNotifications] = useState([]);
  const [artistsById, setArtistsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg("");

        // --- date range: remaining days of this week + full next week (Mon-Sun) ---
        const today = new Date();
        const weekStart = startOfWeekMonday(today);

        const thisWeekEnd = new Date(weekStart);
        thisWeekEnd.setDate(weekStart.getDate() + 6); // Monday -> Sunday

        const nextWeekEnd = new Date(weekStart);
        nextWeekEnd.setDate(weekStart.getDate() + 13); // end of next week

        const from = toYMD(today);        // remaining days of current week (today → end)
        const to = toYMD(nextWeekEnd);    // end of next week

        // --- load posts not marked as "ready" ---
        const { data: posts, error } = await supabase
          .from("posts")
          .select("id, post_name, post_date, status, artist_id")
          .gte("post_date", from)
          .lte("post_date", to)
          .neq("status", "ready")
          .order("post_date", { ascending: true });

        if (error) throw error;

        // --- load artists just for labels ---
        const { data: artists, error: artistError } = await supabase
          .from("artists")
          .select("id, name");

        if (artistError) {
          console.error("Error loading artists:", artistError);
        }

        const map = {};
        (artists || []).forEach((a) => {
          map[a.id] = a.name;
        });

        setArtistsById(map);
        setNotifications(posts || []);
      } catch (err) {
        console.error("Error loading notifications:", err);
        setErrorMsg("Error loading notifications.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const grouped = useMemo(() => {
    // Work with *dates only* (no time component) to avoid timezone issues
    const today = stripTime(new Date());
    const weekStart = startOfWeekMonday(today); // already strips time internally
    const thisWeekEnd = new Date(weekStart);
    thisWeekEnd.setDate(weekStart.getDate() + 6); // Monday → Sunday
    thisWeekEnd.setHours(0, 0, 0, 0);
  
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(weekStart.getDate() + 7);
    nextWeekStart.setHours(0, 0, 0, 0);
  
    const currentWeek = [];
    const nextWeek = [];
  
    for (const post of notifications) {
      const d = stripTime(post.post_date); // normalise post_date as well
  
      if (d >= today && d <= thisWeekEnd) {
        currentWeek.push(post);
      } else if (d >= nextWeekStart) {
        nextWeek.push(post);
      }
    }
  
    return { currentWeek, nextWeek };
  }, [notifications]);
    

  const navItems = [
    { href: "/calendar", label: "Calendar" },
    { href: "/edit-next", label: "Edit Next" },
    { href: "/leads", label: "Leads" },
    { href: "/stats-view", label: "Stats" },
  ];

  const handleNotificationClick = (post) => {
    setSelectedPost(post);
  };

  const closeModal = () => {
    setSelectedPost(null);
  };

  const handleViewInCalendar = () => {
    if (!selectedPost) return;
    // Pass the date as a query param so calendar can use it later if needed
    router.push(`/calendar?date=${selectedPost.post_date}`);
  };

  return (
    <div className="min-h-screen bg-[#a89ee4] flex justify-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4 p-4 md:p-8">
        {/* Collapsible left menu */}
        <div className="md:w-64 md:shrink-0">
          <button
            className="md:hidden mb-2 px-3 py-1.5 text-sm rounded-full bg-[#bbe1ac] shadow"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? "Hide menu" : "Show menu"}
          </button>
          <aside
            className={`${menuOpen ? "block" : "hidden"} md:block bg-[#bbe1ac] rounded-2xl shadow-lg p-4`}
          >
            <h2 className="text-lg font-semibold mb-3">Menu</h2>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block w-full rounded-lg bg-[#eef8ea] px-3 py-2 text-sm font-medium hover:bg-white hover:shadow"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Main content: notifications + bottom section */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Notifications section (main content) */}
          <section className="bg-[#bbe1ac] rounded-2xl shadow-lg p-4 md:p-6 flex-1">
            <h1 className="text-xl md:text-2xl font-bold mb-4">Notifications</h1>

            {errorMsg && (
              <div className="text-red-600 text-sm mb-3 bg-white/60 rounded px-3 py-2">
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div className="text-gray-700 text-sm">Loading notifications…</div>
            ) : (
              <>
                {/* Remaining days of this week */}
                <div className="mb-6">
                  <h2 className="font-semibold mb-2 text-sm uppercase tracking-wide text-gray-800">
                    Remaining This Week
                  </h2>
                  {grouped.currentWeek.length === 0 ? (
                    <div className="text-xs text-gray-700 bg-[#eef8ea] rounded px-3 py-2">
                      No posts pending this week 🎉
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {grouped.currentWeek.map((post) => (
                        <li
                          key={post.id}
                          className="border rounded-md px-3 py-2 text-sm flex justify-between items-start bg-[#eef8ea] cursor-pointer hover:bg-white"
                          onClick={() => handleNotificationClick(post)}
                        >
                          <div>
                            <div className="font-medium">
                              {post.post_name || "(Untitled post)"}
                            </div>
                            <div className="text-xs text-gray-700">
                              {new Date(post.post_date).toLocaleDateString(
                                undefined,
                                {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "2-digit",
                                }
                              )}
                              {" • "}
                              Status:{" "}
                              <span className="font-semibold">
                                {post.status || "unknown"}
                              </span>
                              {post.artist_id && artistsById[post.artist_id] && (
                                <>
                                  {" • "}
                                  Artist: {artistsById[post.artist_id]}
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Next week */}
                <div>
                  <h2 className="font-semibold mb-2 text-sm uppercase tracking-wide text-gray-800">
                    Coming Next Week
                  </h2>
                  {grouped.nextWeek.length === 0 ? (
                    <div className="text-xs text-gray-700 bg-[#eef8ea] rounded px-3 py-2">
                      No posts pending next week yet.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {grouped.nextWeek.map((post) => (
                        <li
                          key={post.id}
                          className="border rounded-md px-3 py-2 text-sm flex justify-between items-start bg-[#eef8ea] cursor-pointer hover:bg-white"
                          onClick={() => handleNotificationClick(post)}
                        >
                          <div>
                            <div className="font-medium">
                              {post.post_name || "(Untitled post)"}
                            </div>
                            <div className="text-xs text-gray-700">
                              {new Date(post.post_date).toLocaleDateString(
                                undefined,
                                {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "2-digit",
                                }
                              )}
                              {" • "}
                              Status:{" "}
                              <span className="font-semibold">
                                {post.status || "unknown"}
                              </span>
                              {post.artist_id && artistsById[post.artist_id] && (
                                <>
                                  {" • "}
                                  Artist: {artistsById[post.artist_id]}
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Bottom placeholder section with empty graph */}
          <section className="bg-[#bbe1ac] rounded-2xl shadow-lg p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-2">Upcoming Insights</h2>
            <p className="text-sm text-gray-800 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec
              malesuada, nisl at convallis facilisis, magna sem aliquet nunc, a
              porttitor lorem ipsum a justo.
            </p>
            <div className="bg-[#eef8ea] rounded-xl border border-dashed border-gray-400 h-48 md:h-56 flex items-center justify-center">
              <span className="text-xs text-gray-600">
                Graph placeholder – data coming soon.
              </span>
            </div>
          </section>
        </div>

        {/* Post modal */}
        {selectedPost && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-lg shadow-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-2">
                {selectedPost.post_name || "(Untitled post)"}
              </h2>
              <p className="text-sm text-gray-700 mb-1">
                <strong>Date:</strong>{" "}
                {new Date(selectedPost.post_date).toLocaleDateString(
                  undefined,
                  {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }
                )}
              </p>
              <p className="text-sm text-gray-700 mb-1">
                <strong>Status:</strong>{" "}
                <span className="font-semibold">
                  {selectedPost.status || "unknown"}
                </span>
              </p>
              {selectedPost.artist_id && artistsById[selectedPost.artist_id] && (
                <p className="text-sm text-gray-700 mb-4">
                  <strong>Artist:</strong> {artistsById[selectedPost.artist_id]}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="px-3 py-1.5 text-sm rounded-full bg-gray-200 hover:bg-gray-300"
                  onClick={closeModal}
                >
                  Close
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded-full bg-[#bbe1ac] hover:bg-[#a5d296]"
                  onClick={handleViewInCalendar}
                >
                  View in calendar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
