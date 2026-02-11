// pages/api/meetings/available-slots.js
// Returns available meeting slots for the booking window
// Supports per-member schedules and intersection mode
//
// ALL datetimes are handled as CET strings to avoid timezone conversion issues.
// We never rely on JavaScript Date local timezone — we build and compare
// explicit CET offset strings (+01:00) throughout.

import { supabaseAdmin } from "../../../lib/supabaseClient";

/**
 * Per-member availability rules (hours in CET)
 */
const MEMBER_HOURS = {
  miguel: {
    1: [11, 12, 13, 14, 15, 16],
    2: [11, 12, 13, 14, 15, 16],
    3: [11, 12, 13, 14, 15, 16],
    4: [11, 12, 13, 14, 15, 16],
    5: [14, 15],
    6: [14, 15],
    0: [],
  },
  sebastian: {
    1: [9, 10, 11, 12, 13, 14, 15, 16],
    2: [9, 10, 11, 12, 13, 14, 15, 16],
    3: [9, 10, 11, 12, 13, 14, 15, 16],
    4: [9, 10, 11, 12, 13, 14, 15, 16],
    5: [9, 10, 11, 12, 13, 14, 15, 16],
    6: [14, 15],
    0: [14, 15],
  },
  yannick: {
    1: [11, 12, 13, 14, 15, 16],
    2: [11, 12, 13, 14, 15, 16],
    3: [11, 12, 13, 14, 15, 16],
    4: [11, 12, 13, 14, 15, 16],
    5: [14, 15],
    6: [14, 15],
    0: [],
  },
};

/**
 * Convert a CET datetime string (YYYY-MM-DDTHH:00:00+01:00) to its
 * equivalent UTC ISO string for consistent comparison with Supabase data.
 */
function cetToUtcIso(cetString) {
  return new Date(cetString).toISOString();
}

/**
 * Generate all possible meeting slots for a specific team member.
 * Uses pure date arithmetic on CET date strings — no reliance on
 * JavaScript Date local timezone for day/hour logic.
 */
function generateSlotsForMember(member) {
  const schedule = MEMBER_HOURS[member];
  if (!schedule) return [];

  const slots = [];

  // Get "today" in CET by formatting the current instant in Europe/Berlin
  const nowUtc = new Date();
  const cetFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayCet = cetFormatter.format(nowUtc); // "YYYY-MM-DD"

  // Start date: 2 days from today (CET)
  const start = addDays(todayCet, 2);
  // End date: 21 days from today (CET)
  const end = addDays(todayCet, 21);

  let current = start;
  while (current <= end) {
    // Get JS day of week for this CET date
    const jsDay = getCetDayOfWeek(current);
    const hours = schedule[jsDay] || [];

    for (const hour of hours) {
      const hourStr = String(hour).padStart(2, "0");
      const cetDatetime = `${current}T${hourStr}:00:00+01:00`;

      slots.push({
        datetime: cetDatetime,
        utcIso: cetToUtcIso(cetDatetime),
        date: current,
        time: `${hourStr}:00`,
        dayOfWeek: jsDay,
        dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][jsDay],
      });
    }

    current = addDays(current, 1);
  }

  return slots;
}

/** Add N days to a "YYYY-MM-DD" string, returns "YYYY-MM-DD" */
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Get JS day-of-week (0=Sun) for a "YYYY-MM-DD" string */
function getCetDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Get booked/blocked UTC ISO datetime strings for a specific team member
 */
async function getBookedDatetimes(member) {
  const { data: bookedSlots, error } = await supabaseAdmin
    .from("meeting_slots")
    .select("meeting_datetime")
    .eq("team_member", member)
    .neq("status", "cancelled");

  if (error) {
    console.error(`Error fetching booked slots for ${member}:`, error);
    throw error;
  }

  return new Set(
    (bookedSlots || []).map((slot) => new Date(slot.meeting_datetime).toISOString())
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const membersParam = req.query.members;
    const members = membersParam
      ? membersParam.split(",").map((m) => m.trim().toLowerCase()).filter((m) => MEMBER_HOURS[m])
      : ["miguel"];

    const memberAvailableSets = [];
    const debug = {};

    for (const member of members) {
      const allSlots = generateSlotsForMember(member);
      const bookedDatetimes = await getBookedDatetimes(member);

      // Compare using UTC ISO strings on both sides
      const availableUtcSet = new Set(
        allSlots
          .filter((slot) => !bookedDatetimes.has(slot.utcIso))
          .map((slot) => slot.utcIso)
      );

      debug[member] = {
        totalPossibleSlots: allSlots.length,
        bookedCount: bookedDatetimes.size,
        bookedDatetimes: [...bookedDatetimes],
        sampleGeneratedUtc: allSlots.slice(0, 3).map((s) => s.utcIso),
        availableAfterFilter: availableUtcSet.size,
      };

      memberAvailableSets.push(availableUtcSet);
    }

    // Intersect all members' available sets
    let intersectedUtc;
    if (memberAvailableSets.length === 1) {
      intersectedUtc = memberAvailableSets[0];
    } else {
      intersectedUtc = new Set(
        [...memberAvailableSets[0]].filter((dt) =>
          memberAvailableSets.every((set) => set.has(dt))
        )
      );
    }

    debug._intersection = { resultCount: intersectedUtc.size };

    // Use first member's slots as reference for metadata, filter by intersection
    const referenceSlots = generateSlotsForMember(members[0]);
    const availableSlots = referenceSlots.filter((slot) =>
      intersectedUtc.has(slot.utcIso)
    );

    debug._referenceSlots = {
      member: members[0],
      totalGenerated: referenceSlots.length,
      afterIntersectionFilter: availableSlots.length,
    };

    // Group by CET date
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

    const availability = Object.values(groupedByDate).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    return res.status(200).json({
      availability,
      timezone: "Europe/Berlin (CET)",
      members,
      debug,
      bookingWindow: { minDays: 2, maxDays: 21 },
    });
  } catch (err) {
    console.error("Error in available-slots:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
