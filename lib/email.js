// lib/email.js
// Email utility using Zoho ZeptoMail

const ZEPTOMAIL_API_URL = "https://api.zeptomail.eu/v1.1/email";

/**
 * Send an email via Zoho ZeptoMail
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.toName - Recipient name (optional)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body (optional fallback)
 */
export async function sendEmail({ to, toName, subject, html, text }) {
  const token = process.env.ZEPTOMAIL_API_TOKEN;
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || "noreply@lasaguasproductions.com";
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || "Las Aguas Productions";

  console.log("[Email] Attempting to send email:", {
    to,
    from: fromEmail,
    subject,
    hasToken: !!token,
    tokenPrefix: token ? token.substring(0, 10) + "..." : "MISSING",
  });

  if (!token) {
    console.error("[Email] ZEPTOMAIL_API_TOKEN is not configured");
    throw new Error("Email service not configured");
  }

  const payload = {
    from: {
      address: fromEmail,
      name: fromName,
    },
    to: [
      {
        email_address: {
          address: to,
          name: toName || to,
        },
      },
    ],
    subject,
    htmlbody: html,
  };

  if (text) {
    payload.textbody = text;
  }

  console.log("[Email] Sending to ZeptoMail API...");

  const response = await fetch(ZEPTOMAIL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Zoho-enczapikey ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log("[Email] ZeptoMail response status:", response.status);
  console.log("[Email] ZeptoMail response body:", responseText);

  if (!response.ok) {
    console.error("[Email] ZeptoMail error:", responseText);
    throw new Error(`Failed to send email: ${response.status} - ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { raw: responseText };
  }
}

/**
 * Send meeting confirmation to the attendee
 * Includes Schema.org JSON-LD for Gmail "Add to Calendar" functionality
 */
export async function sendMeetingConfirmationToAttendee({
  email,
  meetingDatetime, // ISO string or Date object
  meetingDate,     // Formatted date string for display
  meetingTime,     // Formatted time string for display
  timezone,
}) {
  const subject = "Your meeting with Las Aguas Productions is confirmed";

  // Calculate start and end times for Schema.org
  const startDate = new Date(meetingDatetime);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

  // Format as ISO strings for Schema.org
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  // Schema.org Event markup for Gmail calendar integration
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "Meeting with Las Aguas Productions",
    "description": "Digital strategy consultation meeting",
    "startDate": startISO,
    "endDate": endISO,
    "location": {
      "@type": "VirtualLocation",
      "url": "https://lasaguasproductions.com"
    },
    "organizer": {
      "@type": "Organization",
      "name": "Las Aguas Productions",
      "email": "contact@lasaguasproductions.com"
    },
    "attendee": {
      "@type": "Person",
      "email": email
    }
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="application/ld+json">
  ${JSON.stringify(schemaOrg)}
  </script>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <p>Hi there,</p>

  <p>Your meeting with Las Aguas Productions has been confirmed.</p>

  <p style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #33296b;">
    <strong>Date:</strong> ${meetingDate}<br>
    <strong>Time:</strong> ${meetingTime} (${timezone})<br>
    <strong>Duration:</strong> 1 hour
  </p>

  <p>We'll send you the meeting link closer to the date.</p>

  <p>If you need to reschedule, just reply to this email.</p>

  <p style="margin-top: 30px;">
    Best,<br>
    <strong>Las Aguas Productions</strong><br>
    <a href="https://lasaguasproductions.com" style="color: #33296b;">lasaguasproductions.com</a>
  </p>

</body>
</html>
  `;

  const text = `Hi there,

Your meeting with Las Aguas Productions has been confirmed.

Date: ${meetingDate}
Time: ${meetingTime} (${timezone})
Duration: 1 hour

We'll send you the meeting link closer to the date.

If you need to reschedule, just reply to this email.

Best,
Las Aguas Productions
https://lasaguasproductions.com`;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send meeting notification to Las Aguas
 * Includes Schema.org JSON-LD for Gmail "Add to Calendar" functionality
 */
export async function sendMeetingNotificationToAdmin({
  attendeeEmail,
  attendeePhone,
  meetingDatetime, // ISO string or Date object
  meetingDate,
  meetingTime,
  timezone,
  leadId,
  budget,
  notes,
}) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL || "lasaguasproductions@gmail.com";
  const subject = `New Meeting: ${meetingDate} at ${meetingTime} – ${attendeeEmail}`;

  // Calculate start and end times for Schema.org
  const startDate = new Date(meetingDatetime);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

  // Format as ISO strings for Schema.org
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  // Schema.org Event markup for Gmail calendar integration
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": `Meeting: ${attendeeEmail}`,
    "description": `Digital strategy consultation\nBudget: €${budget}/month${notes ? `\nNotes: ${notes}` : ""}`,
    "startDate": startISO,
    "endDate": endISO,
    "location": {
      "@type": "VirtualLocation",
      "url": "https://lasaguasproductions.com"
    },
    "organizer": {
      "@type": "Organization",
      "name": "Las Aguas Productions",
      "email": "contact@lasaguasproductions.com"
    },
    "attendee": {
      "@type": "Person",
      "email": attendeeEmail
    }
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script type="application/ld+json">
  ${JSON.stringify(schemaOrg)}
  </script>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <p><strong>New meeting booked</strong></p>

  <p style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #33296b;">
    <strong>When:</strong> ${meetingDate} at ${meetingTime} (${timezone})<br>
    <strong>Duration:</strong> 1 hour
  </p>

  <p style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #599b40;">
    <strong>Email:</strong> ${attendeeEmail}<br>
    ${attendeePhone ? `<strong>Phone:</strong> ${attendeePhone}<br>` : ""}
    <strong>Budget:</strong> €${budget}/month${notes ? `<br><strong>Notes:</strong> ${notes}` : ""}
  </p>

  <p>
    <a href="https://lasaguasproductions.com/dashboard/leads" style="color: #33296b;">View in Dashboard</a>
  </p>

</body>
</html>
  `;

  const text = `New meeting booked

When: ${meetingDate} at ${meetingTime} (${timezone})
Duration: 1 hour

Email: ${attendeeEmail}
${attendeePhone ? `Phone: ${attendeePhone}\n` : ""}Budget: €${budget}/month
${notes ? `Notes: ${notes}` : ""}

View in Dashboard: https://lasaguasproductions.com/dashboard/leads`;

  return sendEmail({ to: notificationEmail, subject, html, text });
}
