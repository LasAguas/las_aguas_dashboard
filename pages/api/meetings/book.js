// pages/api/meetings/book.js
// Book a meeting slot and send confirmation emails
// Supports multi-member bookings (artist meetings) and single-member (lead meetings)

import { supabaseAdmin } from "../../../lib/supabaseClient";
import {
  sendMeetingConfirmationToAttendee,
  sendMeetingNotificationToAdmin,
} from "../../../lib/email";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { datetime, leadId, email, phone, budget, notes, members, topic } = req.body;

  // Validate required fields
  if (!datetime || !email) {
    return res.status(400).json({ error: "Missing required fields: datetime and email" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Combine notes and topic
  const combinedNotes = [topic, notes].filter(Boolean).join(" | ");

  try {
    // Parse the datetime
    const meetingDatetime = new Date(datetime);
    if (isNaN(meetingDatetime.getTime())) {
      return res.status(400).json({ error: "Invalid datetime format" });
    }

    // Determine which team members to book for
    const bookingMembers = members && members.length > 0 ? members : ["miguel"];

    // Check availability for ALL members
    for (const member of bookingMembers) {
      const { data: existingSlot, error: checkError } = await supabaseAdmin
        .from("meeting_slots")
        .select("id")
        .eq("meeting_datetime", meetingDatetime.toISOString())
        .eq("team_member", member)
        .neq("status", "cancelled")
        .single();

      if (existingSlot) {
        return res.status(409).json({
          error: `This time slot has already been booked for ${member}. Please select another time.`,
        });
      }

      if (checkError && checkError.code !== "PGRST116") {
        console.error(`Error checking slot for ${member}:`, checkError);
        return res.status(500).json({ error: "Failed to check availability" });
      }
    }

    // Insert a row for each team member
    let firstSlot = null;
    for (const member of bookingMembers) {
      const { data: newSlot, error: insertError } = await supabaseAdmin
        .from("meeting_slots")
        .insert([
          {
            meeting_datetime: meetingDatetime.toISOString(),
            attendee_email: email,
            attendee_phone: phone || null,
            lead_id: leadId || null,
            status: "confirmed",
            notes: combinedNotes || null,
            team_member: member,
          },
        ])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return res.status(409).json({
            error: `This time slot has already been booked for ${member}. Please select another time.`,
          });
        }
        console.error(`Error inserting slot for ${member}:`, insertError);
        return res.status(500).json({ error: "Failed to book meeting" });
      }

      if (!firstSlot) firstSlot = newSlot;
    }

    // Update the lead record with the meeting_slot_id if we have a leadId
    if (leadId && firstSlot) {
      const { error: updateError } = await supabaseAdmin
        .from("ad_leads_en")
        .update({ meeting_slot_id: firstSlot.id })
        .eq("id", leadId);

      if (updateError) {
        console.error("Error updating lead with meeting_slot_id:", updateError);
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
      await sendMeetingConfirmationToAttendee({
        email,
        meetingDatetime: meetingDatetime.toISOString(),
        meetingDate: formattedDate,
        meetingTime: formattedTime,
        timezone: "CET",
      });

      if (firstSlot) {
        await supabaseAdmin
          .from("meeting_slots")
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq("id", firstSlot.id);
      }
    } catch (emailError) {
      console.error("Error sending attendee confirmation:", emailError);
    }

    try {
      await sendMeetingNotificationToAdmin({
        attendeeEmail: email,
        attendeePhone: phone,
        meetingDatetime: meetingDatetime.toISOString(),
        meetingDate: formattedDate,
        meetingTime: formattedTime,
        timezone: "CET",
        leadId,
        budget,
        notes: combinedNotes || notes,
      });
    } catch (emailError) {
      console.error("Error sending admin notification:", emailError);
    }

    return res.status(200).json({
      success: true,
      meeting: {
        id: firstSlot?.id,
        datetime: firstSlot?.meeting_datetime,
        formattedDate,
        formattedTime,
        members: bookingMembers,
      },
    });
  } catch (err) {
    console.error("Error in book meeting:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
