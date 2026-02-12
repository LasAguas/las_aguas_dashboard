// pages/forms/schedule-meeting.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Script from "next/script";

export default function ScheduleMeetingPage() {
  const router = useRouter();

  // Lead data from query params (passed from digital-strategy form)
  const [leadData, setLeadData] = useState(null);

  // Availability state
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selection state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Booking state
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookedMeeting, setBookedMeeting] = useState(null);

  // Timezone display preference
  const [showLocalTime, setShowLocalTime] = useState(false);
  const [userTimezone, setUserTimezone] = useState("");

  // Parse query params on mount
  useEffect(() => {
    if (router.isReady) {
      const { leadId, email, phone, budget, notes } = router.query;
      if (email) {
        setLeadData({
          leadId: leadId || null,
          email: decodeURIComponent(email),
          phone: phone ? decodeURIComponent(phone) : null,
          budget: budget ? parseInt(budget, 10) : null,
          notes: notes ? decodeURIComponent(notes) : null,
        });
      }
    }
  }, [router.isReady, router.query]);

  // Detect user timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(tz);
    } catch {
      setUserTimezone("Unknown");
    }
  }, []);

  // Fetch availability
  useEffect(() => {
    async function fetchAvailability() {
      try {
        const res = await fetch("/api/meetings/available-slots");
        if (!res.ok) throw new Error("Failed to fetch availability");
        const data = await res.json();
        setAvailability(data.availability || []);
      } catch (err) {
        console.error("Error fetching availability:", err);
        setError("Failed to load available times. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    fetchAvailability();
  }, []);

  // Format time for display
  const formatTime = (datetime, time) => {
    if (!showLocalTime) {
      // Show CET time as-is
      return time;
    }

    // Convert to user's local timezone
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

  // Format date for display
  const formatDate = (dateStr, dayName) => {
    const date = new Date(dateStr + "T12:00:00");
    const month = date.toLocaleDateString(undefined, { month: "short" });
    const day = date.getDate();
    return { month, day, dayName };
  };

  // Handle booking
  const handleBook = async () => {
    if (!selectedSlot || !leadData?.email) return;

    setBooking(true);
    setError("");

    try {
      const res = await fetch("/api/meetings/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datetime: selectedSlot.datetime,
          leadId: leadData.leadId,
          email: leadData.email,
          phone: leadData.phone,
          budget: leadData.budget,
          notes: leadData.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          // Slot was taken, refresh availability
          setError(data.error || "This slot was just booked. Please select another time.");
          setSelectedSlot(null);
          // Refresh availability
          const refreshRes = await fetch("/api/meetings/available-slots");
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setAvailability(refreshData.availability || []);
          }
        } else {
          setError(data.error || "Failed to book meeting. Please try again.");
        }
        return;
      }

      // Success!
      setBookingSuccess(true);
      setBookedMeeting(data.meeting);

      // Fire Meta pixel event if available
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "Schedule");
      }
    } catch (err) {
      console.error("Booking error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  // Success view
  if (bookingSuccess && bookedMeeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#a89ee4] p-4">
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1596969374985643');
            fbq('track', 'PageView');
          `}
        </Script>

        <div className="w-full max-w-md bg-[#bbe1ac] p-8 rounded-2xl shadow-lg text-center">
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

          <h1 className="text-2xl font-bold text-[#33296b] mb-2">Meeting Confirmed!</h1>

          <div className="bg-white/60 rounded-lg p-4 mb-4 text-left">
            <p className="text-sm text-[#33296b] mb-1">
              <strong>Date:</strong> {bookedMeeting.formattedDate}
            </p>
            <p className="text-sm text-[#33296b] mb-1">
              <strong>Time:</strong> {bookedMeeting.formattedTime} (CET)
            </p>
            <p className="text-sm text-[#33296b]">
              <strong>Duration:</strong> 1 hour
            </p>
          </div>

          <p className="text-sm text-[#33296b] mb-6">
            A confirmation email has been sent to <strong>{leadData?.email}</strong>.
            We&apos;ll reach out with meeting details before the call.
          </p>

          <Link
            href="https://lasaguasproductions.com"
            className="inline-block bg-[#33296b] text-white py-2 px-6 rounded-lg hover:bg-[#4a3d8a] transition-colors"
          >
            Return to Website
          </Link>
        </div>
      </div>
    );
  }

  // Loading view
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#a89ee4] p-4">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#33296b] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#33296b]">Loading available times...</p>
        </div>
      </div>
    );
  }

  // No email provided
  if (!leadData?.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#a89ee4] p-4">
        <div className="w-full max-w-md bg-[#bbe1ac] p-8 rounded-2xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-[#33296b] mb-4">Session Expired</h1>
          <p className="text-sm text-[#33296b] mb-6">
            Please fill out the form again to schedule a meeting.
          </p>
          <Link
            href="/forms/digital-strategy"
            className="inline-block bg-[#599b40] text-[#33296b] py-2 px-6 rounded-lg hover:bg-[#a89ee4] transition-colors"
          >
            Go to Form
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#a89ee4] p-4 py-8">
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1596969374985643');
          fbq('track', 'PageView');
        `}
      </Script>

      <div className="max-w-2xl mx-auto">
        <div className="bg-[#bbe1ac] p-6 md:p-8 rounded-2xl shadow-lg">
          <h1 className="text-2xl font-bold text-[#33296b] mb-2">
            Schedule Your Meeting
          </h1>
          <p className="text-sm text-[#33296b] mb-6">
            Select a date and time that works for you. All times are shown in{" "}
            <strong>{showLocalTime ? userTimezone : "CET (Central European Time)"}</strong>.
          </p>

          {/* Timezone toggle */}
          <div className="mb-6">
            <label className="inline-flex items-center text-sm text-[#33296b] cursor-pointer">
              <input
                type="checkbox"
                checked={showLocalTime}
                onChange={(e) => setShowLocalTime(e.target.checked)}
                className="mr-2"
              />
              Show times in my local timezone ({userTimezone})
            </label>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded px-3 py-2">
              {error}
            </div>
          )}

          {/* Date selection */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-[#33296b] mb-3">Select a date:</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {availability.map((day) => {
                const { month, day: dayNum, dayName } = formatDate(day.date, day.dayName);
                const isSelected = selectedDate === day.date;
                return (
                  <button
                    key={day.date}
                    onClick={() => {
                      setSelectedDate(day.date);
                      setSelectedSlot(null);
                    }}
                    className={`flex-shrink-0 w-20 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-[#33296b] bg-[#33296b] text-white"
                        : "border-[#33296b]/30 bg-white/60 text-[#33296b] hover:border-[#33296b]/60"
                    }`}
                  >
                    <div className="text-xs font-medium">{dayName.slice(0, 3)}</div>
                    <div className="text-2xl font-bold">{dayNum}</div>
                    <div className="text-xs">{month}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time selection */}
          {selectedDate && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-[#33296b] mb-3">Select a time:</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availability
                  .find((d) => d.date === selectedDate)
                  ?.slots.map((slot) => {
                    const isSelected = selectedSlot?.datetime === slot.datetime;
                    const displayTime = formatTime(slot.datetime, slot.time);
                    return (
                      <button
                        key={slot.datetime}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-lg border-2 transition-all font-medium ${
                          isSelected
                            ? "border-[#33296b] bg-[#33296b] text-white"
                            : "border-[#33296b]/30 bg-white/60 text-[#33296b] hover:border-[#33296b]/60"
                        }`}
                      >
                        {displayTime}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Confirm button */}
          {selectedSlot && (
            <div className="border-t border-[#33296b]/20 pt-6">
              <div className="bg-white/60 rounded-lg p-4 mb-4">
                <p className="text-sm text-[#33296b]">
                  <strong>Selected:</strong>{" "}
                  {new Date(selectedSlot.datetime).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at {formatTime(selectedSlot.datetime, selectedSlot.time)}
                </p>
                <p className="text-sm text-[#33296b] mt-1">
                  <strong>Duration:</strong> 1 hour
                </p>
                <p className="text-sm text-[#33296b] mt-1">
                  <strong>Confirmation email to:</strong> {leadData.email}
                </p>
              </div>

              <button
                onClick={handleBook}
                disabled={booking}
                className="w-full bg-[#599b40] text-[#33296b] py-3 px-4 rounded-lg font-medium hover:bg-[#4a8a35] focus:outline-none focus:ring-2 focus:ring-[#33296b] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {booking ? "Booking..." : "Confirm Meeting"}
              </button>
            </div>
          )}

          {/* No availability message */}
          {availability.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#33296b] mb-4">
                No available time slots at the moment. Please check back later or contact us directly.
              </p>
              <a
                href="mailto:lasaguasproductions@gmail.com"
                className="text-[#33296b] underline hover:opacity-80"
              >
                lasaguasproductions@gmail.com
              </a>
            </div>
          ) : (
            <div className="text-center mt-6 text-sm text-[#33296b]/70">
              Can&apos;t find a time that works?{" "}
              <a
                href="mailto:lasaguasproductions@gmail.com"
                className="text-[#33296b] underline hover:opacity-80"
              >
                Email us
              </a>{" "}
              to request a different time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
