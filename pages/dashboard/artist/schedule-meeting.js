"use client";

import { useEffect, useState, useCallback } from "react";
import ArtistLayout from "../../../components/artist/ArtistLayout";
import { getMyArtistContext } from "../../../components/artist/artistData";
import { supabase } from "../../../lib/supabaseClient";

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDate(dateStr, dayName) {
  const date = new Date(dateStr + "T12:00:00");
  const month = date.toLocaleDateString(undefined, { month: "short" });
  const day = date.getDate();
  return { month, day, dayName };
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function ArtistScheduleMeetingPage() {
  const [userName, setUserName] = useState("");
  const [artistEmail, setArtistEmail] = useState("");
  const [projectLead, setProjectLead] = useState(null); // e.g. "sebastian"
  const [loading, setLoading] = useState(true);

  // Topic checkboxes (affect which team members are needed)
  const [includesVideo, setIncludesVideo] = useState(false);
  const [includesAds, setIncludesAds] = useState(false);

  // Meeting data
  const [availability, setAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [topic, setTopic] = useState("");

  // Timezone
  const [showLocalTime, setShowLocalTime] = useState(false);
  const [userTimezone, setUserTimezone] = useState("");

  // Booking flow
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState("");

  // Compute required members based on project lead + topic checkboxes
  const getRequiredMembers = useCallback(() => {
    if (!projectLead) return [];
    const members = new Set([projectLead]);
    if (includesVideo) members.add("yannick");
    if (includesAds) members.add("miguel");
    return [...members];
  }, [projectLead, includesVideo, includesAds]);

  // Load user info + artist's project lead
  useEffect(() => {
    async function loadData() {
      try {
        const { artistId } = await getMyArtistContext();

        // Get artist's project lead
        const { data: artist } = await supabase
          .from("artists")
          .select("project_lead")
          .eq("id", artistId)
          .single();

        setProjectLead(artist?.project_lead || "sebastian");

        // Get user info
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;
        setArtistEmail(user.email || "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        setUserName(profile?.full_name || user.user_metadata?.full_name || "");
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    }
    loadData();
  }, []);

  // Detect timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(tz);
    } catch {
      setUserTimezone("Unknown");
    }
  }, []);

  // Fetch real availability whenever required members change
  useEffect(() => {
    const members = getRequiredMembers();
    console.log("[schedule-meeting] projectLead:", projectLead, "| includesVideo:", includesVideo, "| includesAds:", includesAds, "| requiredMembers:", members);
    if (members.length === 0) return;

    async function fetchAvailability() {
      setLoading(true);
      setError("");
      // Reset selections when members change
      setSelectedDate(null);
      setSelectedSlot(null);

      try {
        const url = `/api/meetings/available-slots?members=${members.join(",")}`;
        console.log("[schedule-meeting] fetching:", url);
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch availability");
        const data = await res.json();
        console.log("[schedule-meeting] debug from API:", JSON.stringify(data.debug, null, 2));
        // Filter out same-day slots (artists cannot book same-day meetings)
        const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
        const filtered = (data.availability || []).filter((day) => day.date > todayStr);
        console.log("[schedule-meeting] dates returned:", filtered.map(d => d.date));
        setAvailability(filtered);
      } catch (err) {
        console.error("Error fetching availability:", err);
        setError("Failed to load available times. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    fetchAvailability();
  }, [getRequiredMembers]);

  // Format time
  const formatTime = (datetime, time) => {
    if (!showLocalTime) return time;
    try {
      const date = new Date(datetime);
      return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: userTimezone,
      });
    } catch {
      return time;
    }
  };

  // Handle booking
  async function handleBook() {
    if (!selectedSlot) return;
    setBooking(true);
    setError("");

    try {
      const members = getRequiredMembers();

      const res = await fetch("/api/meetings/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datetime: selectedSlot.datetime,
          email: artistEmail,
          members,
          topic,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(data.error || "This slot was just booked. Please select another time.");
          setSelectedSlot(null);
          // Refresh availability
          const refreshRes = await fetch(
            `/api/meetings/available-slots?members=${members.join(",")}`
          );
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setAvailability(refreshData.availability || []);
          }
        } else {
          setError(data.error || "Failed to book meeting. Please try again.");
        }
        return;
      }

      setBookingSuccess(true);
    } catch (err) {
      console.error("Booking error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  // ─── Success view ──────────────────────────────────────────────────────
  if (bookingSuccess) {
    return (
      <ArtistLayout title="Schedule a Meeting">
        <div className="max-w-lg mx-auto">
          <div className="artist-panel p-6 md:p-8 text-center">
            <div className="w-16 h-16 bg-[#599b40] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-[#33296b] mb-2">
              Meeting Booked!
            </h2>
            <p className="text-sm text-[#33296b]/80 mb-6">
              We&apos;ll confirm your meeting shortly and send details to{" "}
              <strong>{artistEmail}</strong>.
            </p>

            <div className="bg-white/60 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-[#33296b] mb-1">
                <strong>Date:</strong>{" "}
                {new Date(selectedSlot.datetime).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-sm text-[#33296b] mb-1">
                <strong>Time:</strong>{" "}
                {formatTime(selectedSlot.datetime, selectedSlot.time)} (
                {showLocalTime ? userTimezone : "CET"})
              </p>
              <p className="text-sm text-[#33296b] mb-1">
                <strong>Duration:</strong> 1 hour
              </p>
              {topic.trim() && (
                <p className="text-sm text-[#33296b] mt-2">
                  <strong>Topic:</strong> {topic}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setBookingSuccess(false);
                setSelectedDate(null);
                setSelectedSlot(null);
                setTopic("");
                setIncludesVideo(false);
                setIncludesAds(false);
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#33296b] text-white hover:opacity-90 transition-opacity"
            >
              Schedule Another Meeting
            </button>
          </div>
        </div>
      </ArtistLayout>
    );
  }

  // ─── Main view ─────────────────────────────────────────────────────────
  return (
    <ArtistLayout title="Schedule a Meeting">
      <div className="max-w-2xl mx-auto">
        <div className="artist-panel p-5 md:p-8">
          {/* Intro */}
          <p className="text-sm text-[#33296b]/80 mb-5">
            Hi{userName ? ` ${userName}` : ""}! Pick a date and time to
            schedule a meeting with the team. All times are shown in{" "}
            <strong>
              {showLocalTime ? userTimezone : "CET (Central European Time)"}
            </strong>
            .
          </p>

          {/* Timezone toggle */}
          {userTimezone && userTimezone !== "Europe/Berlin" && (
            <div className="mb-5">
              <label className="inline-flex items-center text-sm text-[#33296b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLocalTime}
                  onChange={(e) => setShowLocalTime(e.target.checked)}
                  className="mr-2 accent-[#33296b]"
                />
                Show times in my timezone ({userTimezone})
              </label>
            </div>
          )}

          {/* ── Topic checkboxes ─────────────────────────────────────── */}
          <div className="mb-5 p-4 bg-white/40 rounded-xl">
            <h2 className="text-sm font-semibold text-[#33296b] mb-3">
              Will this meeting include questions about:
            </h2>
            <div className="flex flex-col gap-2.5">
              <label className="inline-flex items-center text-sm text-[#33296b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includesVideo}
                  onChange={(e) => setIncludesVideo(e.target.checked)}
                  className="mr-2.5 accent-[#33296b] w-4 h-4"
                />
                Video (filming, editing, visuals)
              </label>
              <label className="inline-flex items-center text-sm text-[#33296b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includesAds}
                  onChange={(e) => setIncludesAds(e.target.checked)}
                  className="mr-2.5 accent-[#33296b] w-4 h-4"
                />
                Ads (campaigns, targeting, budget)
              </label>
            </div>
            <p className="text-[11px] text-[#33296b]/50 mt-2.5">
              This helps us find times when the right team members are available.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin w-7 h-7 border-3 border-[#33296b] border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-[#33296b]/70">
                Loading available times…
              </p>
            </div>
          ) : availability.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[#33296b]/70">
                No available slots at the moment. Please check back later.
              </p>
            </div>
          ) : (
            <>
              {/* ── Date pills ─────────────────────────────────────────── */}
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-[#33296b] mb-3">
                  Select a date
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {availability.map((day) => {
                    const {
                      month,
                      day: dayNum,
                      dayName,
                    } = formatDate(day.date, day.dayName);
                    const isSelected = selectedDate === day.date;

                    return (
                      <button
                        key={day.date}
                        onClick={() => {
                          setSelectedDate(day.date);
                          setSelectedSlot(null);
                        }}
                        className={[
                          "flex-shrink-0 w-[72px] py-3 rounded-xl border-2 transition-all text-center",
                          isSelected
                            ? "border-[#33296b] bg-[#33296b] text-white"
                            : "border-[#33296b]/25 bg-white/60 text-[#33296b] hover:border-[#33296b]/50",
                        ].join(" ")}
                      >
                        <div className="text-[11px] font-medium">
                          {dayName.slice(0, 3)}
                        </div>
                        <div className="text-2xl font-bold leading-tight">
                          {dayNum}
                        </div>
                        <div className="text-[11px]">{month}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Time grid ──────────────────────────────────────────── */}
              {selectedDate && (
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-[#33296b] mb-3">
                    Select a time
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availability
                      .find((d) => d.date === selectedDate)
                      ?.slots.map((slot) => {
                        const isSelected =
                          selectedSlot?.datetime === slot.datetime;
                        const displayTime = formatTime(
                          slot.datetime,
                          slot.time
                        );

                        return (
                          <button
                            key={slot.datetime}
                            onClick={() => setSelectedSlot(slot)}
                            className={[
                              "py-2.5 rounded-xl border-2 transition-all font-medium text-sm",
                              isSelected
                                ? "border-[#33296b] bg-[#33296b] text-white"
                                : "border-[#33296b]/25 bg-white/60 text-[#33296b] hover:border-[#33296b]/50",
                            ].join(" ")}
                          >
                            {displayTime}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ── Topic + Confirm ────────────────────────────────────── */}
              {selectedSlot && (
                <div className="border-t border-[#33296b]/15 pt-5 mt-2">
                  {/* Topic textarea */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-[#33296b] mb-2">
                      What is this meeting about?
                    </label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Discuss upcoming release strategy, review content calendar, branding questions…"
                      className="w-full rounded-xl border border-gray-300 bg-white text-sm p-3 leading-relaxed focus:ring-2 focus:ring-[#33296b]/20 focus:border-[#33296b]/40 min-h-[90px] resize-none"
                    />
                    <p className="text-[11px] text-[#33296b]/50 mt-1">
                      This helps us prepare for the meeting.
                    </p>
                  </div>

                  {/* Confirmation email */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-[#33296b] mb-2">
                      Send confirmation to
                    </label>
                    <input
                      type="email"
                      value={artistEmail}
                      onChange={(e) => setArtistEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-xl border border-gray-300 bg-white text-sm p-3 focus:ring-2 focus:ring-[#33296b]/20 focus:border-[#33296b]/40"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-white/60 rounded-xl p-4 mb-4">
                    <p className="text-sm text-[#33296b]">
                      <strong>Selected:</strong>{" "}
                      {new Date(
                        selectedSlot.datetime
                      ).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {formatTime(selectedSlot.datetime, selectedSlot.time)}
                    </p>
                    <p className="text-sm text-[#33296b] mt-1">
                      <strong>Duration:</strong> 1 hour
                    </p>
                  </div>

                  {/* Confirm button */}
                  <button
                    onClick={handleBook}
                    disabled={booking}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-[#33296b] text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                  >
                    {booking ? "Booking…" : "Book Meeting"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ArtistLayout>
  );
}
