// pages/api/meetings/available-slots.js
// Returns available meeting slots for the booking window

import { supabaseAdmin } from "../../../lib/supabaseClient";

/**
 * Generate all possible meeting slots for the booking window
 * Rules:
 * - Monday-Thursday: 13:00, 14:00, 15:00, 16:00 (4 slots)
 * - Friday-Saturday: 14:00, 15:00 (2 slots)
 * - Sunday: No slots
 * - Minimum: 2 days from now
 * - Maximum: 3 weeks from now
 */
function generatePossibleSlots() {
  const slots = [];
  const now = new Date();

  // Start date: 2 days from now (in CET)
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() + 2);
  startDate.setHours(0, 0, 0, 0);

  // End date: 3 weeks from now
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 21);
  endDate.setHours(23, 59, 59, 999);

  // Iterate through each day
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    let hours = [];

    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      // Monday to Thursday: 13:00-16:00
      hours = [13, 14, 15, 16];
    } else if (dayOfWeek === 5 || dayOfWeek === 6) {
      // Friday and Saturday: 14:00-15:00
      hours = [14, 15];
    }
    // Sunday (0): no slots

    for (const hour of hours) {
      // Create a datetime in CET (Europe/Berlin)
      const slotDate = new Date(currentDate);
      slotDate.setHours(hour, 0, 0, 0);

      // Convert to ISO string for consistent storage
      // We'll format this as a CET datetime string
      const year = slotDate.getFullYear();
      const month = String(slotDate.getMonth() + 1).padStart(2, "0");
      const day = String(slotDate.getDate()).padStart(2, "0");
      const hourStr = String(hour).padStart(2, "0");

      // Store as ISO-like string with explicit CET interpretation
      const slotDatetime = `${year}-${month}-${day}T${hourStr}:00:00+01:00`; // CET offset

      slots.push({
        datetime: slotDatetime,
        date: `${year}-${month}-${day}`,
        time: `${hourStr}:00`,
        dayOfWeek,
        dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek],
      });
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Generate all possible slots
    const allSlots = generatePossibleSlots();

    // Get already booked slots from database
    const { data: bookedSlots, error } = await supabaseAdmin
      .from("meeting_slots")
      .select("meeting_datetime")
      .neq("status", "cancelled");

    if (error) {
      console.error("Error fetching booked slots:", error);
      return res.status(500).json({ error: "Failed to fetch availability" });
    }

    // Create a Set of booked datetime strings for fast lookup
    const bookedDatetimes = new Set(
      (bookedSlots || []).map((slot) => {
        // Normalize the datetime for comparison
        const d = new Date(slot.meeting_datetime);
        return d.toISOString();
      })
    );

    // Filter out booked slots
    const availableSlots = allSlots.filter((slot) => {
      const slotDate = new Date(slot.datetime);
      return !bookedDatetimes.has(slotDate.toISOString());
    });

    // Group by date for easier frontend consumption
    const groupedByDate = {};
    for (const slot of availableSlots) {
      if (!groupedByDate[slot.date]) {
        groupedByDate[slot.date] = {
          date: slot.date,
          dayName: slot.dayName,
          dayOfWeek: slot.dayOfWeek,
          slots: [],
        };
      }
      groupedByDate[slot.date].slots.push({
        datetime: slot.datetime,
        time: slot.time,
      });
    }

    // Convert to sorted array
    const availability = Object.values(groupedByDate).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    return res.status(200).json({
      availability,
      timezone: "Europe/Berlin (CET)",
      bookingWindow: {
        minDays: 2,
        maxDays: 21,
      },
    });
  } catch (err) {
    console.error("Error in available-slots:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
