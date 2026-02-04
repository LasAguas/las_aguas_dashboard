// pages/api/meetings/manage-slots.js
// Manage meeting slots - block/unblock times, get all meetings

import { supabaseAdmin } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  // GET: Fetch all meetings and blocked slots
  if (req.method === "GET") {
    try {
      const { data: slots, error } = await supabaseAdmin
        .from("meeting_slots")
        .select("*")
        .order("meeting_datetime", { ascending: true });

      if (error) {
        console.error("Error fetching meeting slots:", error);
        return res.status(500).json({ error: "Failed to fetch slots" });
      }

      return res.status(200).json({ slots: slots || [] });
    } catch (err) {
      console.error("Error in manage-slots GET:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // POST: Block a time slot (admin-only)
  if (req.method === "POST") {
    const { datetime, reason } = req.body;

    if (!datetime) {
      return res.status(400).json({ error: "datetime is required" });
    }

    try {
      const meetingDatetime = new Date(datetime);
      if (isNaN(meetingDatetime.getTime())) {
        return res.status(400).json({ error: "Invalid datetime format" });
      }

      // Check if slot already exists
      const { data: existing, error: checkError } = await supabaseAdmin
        .from("meeting_slots")
        .select("id, status")
        .eq("meeting_datetime", meetingDatetime.toISOString())
        .single();

      if (existing) {
        return res.status(409).json({
          error: "This time slot is already booked or blocked.",
          existing: existing,
        });
      }

      // Insert blocked slot
      const { data: newSlot, error: insertError } = await supabaseAdmin
        .from("meeting_slots")
        .insert([
          {
            meeting_datetime: meetingDatetime.toISOString(),
            attendee_email: "blocked@internal",
            status: "blocked",
            notes: reason || "Blocked by admin",
          },
        ])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return res.status(409).json({ error: "This time slot is already taken." });
        }
        console.error("Error blocking slot:", insertError);
        return res.status(500).json({ error: "Failed to block slot" });
      }

      return res.status(200).json({ success: true, slot: newSlot });
    } catch (err) {
      console.error("Error in manage-slots POST:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // DELETE: Unblock a time slot or cancel a meeting
  if (req.method === "DELETE") {
    const { id, datetime } = req.body;

    if (!id && !datetime) {
      return res.status(400).json({ error: "id or datetime is required" });
    }

    try {
      let query = supabaseAdmin.from("meeting_slots").delete();

      if (id) {
        query = query.eq("id", id);
      } else {
        const meetingDatetime = new Date(datetime);
        query = query.eq("meeting_datetime", meetingDatetime.toISOString());
      }

      const { error } = await query;

      if (error) {
        console.error("Error deleting slot:", error);
        return res.status(500).json({ error: "Failed to delete slot" });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Error in manage-slots DELETE:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // PATCH: Update slot status (e.g., mark as completed, cancelled)
  if (req.method === "PATCH") {
    const { id, status, notes } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    try {
      const updates = {};
      if (status) updates.status = status;
      if (notes !== undefined) updates.notes = notes;

      const { data, error } = await supabaseAdmin
        .from("meeting_slots")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating slot:", error);
        return res.status(500).json({ error: "Failed to update slot" });
      }

      return res.status(200).json({ success: true, slot: data });
    } catch (err) {
      console.error("Error in manage-slots PATCH:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
