// pages/api/meetings/book.js
// Book a meeting slot and send confirmation emails

import { supabaseAdmin } from "../../../lib/supabaseClient";
import {
  sendMeetingConfirmationToAttendee,
  sendMeetingNotificationToAdmin,
} from "../../../lib/email";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { datetime, leadId, email, phone, budget, notes } = req.body;

  // Validate required fields
  if (!datetime || !email) {
    return res.status(400).json({ error: "Missing required fields: datetime and email" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    // Parse the datetime
    const meetingDatetime = new Date(datetime);
    if (isNaN(meetingDatetime.getTime())) {
      return res.status(400).json({ error: "Invalid datetime format" });
    }

    // Check if slot is still available (prevent race conditions)
    const { data: existingSlot, error: checkError } = await supabaseAdmin
      .from("meeting_slots")
      .select("id")
      .eq("meeting_datetime", meetingDatetime.toISOString())
      .neq("status", "cancelled")
      .single();

    if (existingSlot) {
      return res.status(409).json({
        error: "This time slot has already been booked. Please select another time.",
      });
    }

    // checkError with code PGRST116 means no rows found, which is what we want
    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking slot availability:", checkError);
      return res.status(500).json({ error: "Failed to check availability" });
    }

    // Insert the meeting slot
    const { data: newSlot, error: insertError } = await supabaseAdmin
      .from("meeting_slots")
      .insert([
        {
          meeting_datetime: meetingDatetime.toISOString(),
          attendee_email: email,
          attendee_phone: phone || null,
          lead_id: leadId || null,
          status: "confirmed",
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation (double booking)
      if (insertError.code === "23505") {
        return res.status(409).json({
          error: "This time slot has already been booked. Please select another time.",
        });
      }
      console.error("Error inserting meeting slot:", insertError);
      return res.status(500).json({ error: "Failed to book meeting" });
    }

    // Update the lead record with the meeting_slot_id if we have a leadId
    if (leadId) {
      const { error: updateError } = await supabaseAdmin
        .from("ad_leads_en")
        .update({ meeting_slot_id: newSlot.id })
        .eq("id", leadId);

      if (updateError) {
        console.error("Error updating lead with meeting_slot_id:", updateError);
        // Don't fail the request, the meeting is still booked
      }
    }

    // Format date and time for emails
    const dateOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Europe/Berlin",
    };
    const timeOptions = {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    };

    const formattedDate = meetingDatetime.toLocaleDateString("en-US", dateOptions);
    const formattedTime = meetingDatetime.toLocaleTimeString("en-US", timeOptions);

    // Send confirmation emails
    try {
      // Email to attendee
      await sendMeetingConfirmationToAttendee({
        email,
        meetingDatetime: meetingDatetime.toISOString(),
        meetingDate: formattedDate,
        meetingTime: formattedTime,
        timezone: "CET",
      });

      // Update confirmation_sent_at
      await supabaseAdmin
        .from("meeting_slots")
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq("id", newSlot.id);
    } catch (emailError) {
      console.error("Error sending attendee confirmation:", emailError);
      // Don't fail the request - meeting is booked, email just failed
    }

    try {
      // Email to admin
      await sendMeetingNotificationToAdmin({
        attendeeEmail: email,
        attendeePhone: phone,
        meetingDatetime: meetingDatetime.toISOString(),
        meetingDate: formattedDate,
        meetingTime: formattedTime,
        timezone: "CET",
        leadId,
        budget,
        notes,
      });
    } catch (emailError) {
      console.error("Error sending admin notification:", emailError);
      // Don't fail the request
    }

    return res.status(200).json({
      success: true,
      meeting: {
        id: newSlot.id,
        datetime: newSlot.meeting_datetime,
        formattedDate,
        formattedTime,
      },
    });
  } catch (err) {
    console.error("Error in book meeting:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
