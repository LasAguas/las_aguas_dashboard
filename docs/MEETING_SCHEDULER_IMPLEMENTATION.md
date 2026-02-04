# Meeting Scheduler Implementation Guide

This guide walks you through implementing the budget-based routing system for the digital strategy form, including the meeting scheduler and email notifications.

---

## Table of Contents

1. [Overview](#overview)
2. [Email Provider Setup](#email-provider-setup)
3. [Supabase Database Changes](#supabase-database-changes)
4. [Code Implementation](#code-implementation)
5. [Testing Checklist](#testing-checklist)

---

## Overview

### User Flow

```
User submits digital-strategy form
           │
           ▼
    Budget >= €280?
      /         \
    YES          NO
     │            │
     ▼            ▼
 Scheduler    Success message +
   Page       "Check out resources"
     │        link to /resources
     ▼
 User picks
 time slot
     │
     ▼
 Confirmation
 emails sent
 (user + you)
```

### Meeting Availability Rules
- **Monday–Thursday**: 13:00, 14:00, 15:00, 16:00 (4 slots/day)
- **Friday–Saturday**: 14:00, 15:00 (2 slots/day)
- **Sunday**: No availability
- **Duration**: 1 hour per meeting
- **Booking window**: 2 days minimum, 3 weeks maximum from submission
- **Timezone**: CET (Europe/Berlin) with option to display in user's local timezone

---

## Email Provider Setup

You have several options for sending transactional emails. Since you already use Zoho, that's likely your best choice for simplicity.

### Option Comparison

| Provider | Free Tier | Pros | Cons | Best For |
|----------|-----------|------|------|----------|
| **Zoho ZeptoMail** | 10,000 emails/month free | Already in Zoho ecosystem, good deliverability, easy DNS if using Zoho domain | Slightly more complex API than others | You (already using Zoho) |
| **Resend** | 3,000 emails/month free | Modern API, excellent DX, React email templates | Newer service | Developers who want simplicity |
| **SendGrid** | 100 emails/day free | Industry standard, robust | UI can be overwhelming | High volume senders |
| **Postmark** | 100 emails/month free | Best deliverability | Small free tier | Transactional-only needs |
| **Nodemailer + Gmail** | 500 emails/day | No extra service needed | Less reliable, may hit spam | Testing only |

---

### Recommended: Zoho ZeptoMail Setup

Since you're already in the Zoho ecosystem, ZeptoMail is the most logical choice.

#### Step 1: Access ZeptoMail

1. Go to [https://zeptomail.zoho.eu/](https://zeptomail.zoho.eu/) (use .com if you're on US Zoho)
2. Sign in with your Zoho account
3. If first time, you'll need to verify your account

#### Step 2: Add & Verify Your Domain

1. Click **"Mail Agents"** → **"Add Mail Agent"**
2. Enter a name (e.g., "Las Aguas Notifications")
3. Click **"Add Domain"** and enter: `lasaguasproductions.com`
4. You'll see DNS records to add. Go to your domain registrar and add these:

   **SPF Record** (TXT):
   ```
   Type: TXT
   Host: @
   Value: v=spf1 include:zeptomail.eu ~all
   ```
   *(If you already have an SPF record, add `include:zeptomail.eu` before the `~all`)*

   **DKIM Record** (TXT):
   ```
   Type: TXT
   Host: zmail._domainkey
   Value: [Zoho will provide this - it's a long string]
   ```

   **DMARC Record** (TXT) - Optional but recommended:
   ```
   Type: TXT
   Host: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:lasaguasproductions@gmail.com
   ```

5. Wait for DNS propagation (usually 5-30 minutes, can take up to 48h)
6. Click **"Verify"** in ZeptoMail once DNS is set up

#### Step 3: Generate API Token

1. In ZeptoMail, go to **"Mail Agents"** → Select your agent
2. Click **"API"** in the left sidebar
3. Click **"Generate Token"**
4. Name it: `las-aguas-dashboard`
5. **Copy and save this token immediately** - you won't see it again!

#### Step 4: Add to Environment Variables

Add to your `.env.local` file:

```env
# Zoho ZeptoMail
ZEPTOMAIL_API_TOKEN=your_token_here
ZEPTOMAIL_FROM_EMAIL=noreply@lasaguasproductions.com
ZEPTOMAIL_FROM_NAME=Las Aguas Productions
NOTIFICATION_EMAIL=lasaguasproductions@gmail.com
```

---

### Alternative: Resend Setup (Simpler but separate service)

If you prefer a simpler API or want to try something modern:

#### Step 1: Create Account
1. Go to [https://resend.com](https://resend.com)
2. Sign up with email or GitHub

#### Step 2: Add Domain
1. Go to **Domains** → **Add Domain**
2. Enter `lasaguasproductions.com`
3. Add the DNS records shown (similar to Zoho - SPF, DKIM)
4. Verify domain

#### Step 3: Get API Key
1. Go to **API Keys** → **Create API Key**
2. Name: `las-aguas-dashboard`
3. Permission: **Sending access**
4. Copy the key

#### Step 4: Environment Variables

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@lasaguasproductions.com
NOTIFICATION_EMAIL=lasaguasproductions@gmail.com
```

---

### Alternative: SendGrid Setup

#### Step 1: Create Account
1. Go to [https://sendgrid.com](https://sendgrid.com)
2. Sign up (requires credit card even for free tier)

#### Step 2: Sender Authentication
1. Go to **Settings** → **Sender Authentication**
2. Choose **Domain Authentication**
3. Add your domain and DNS records

#### Step 3: Get API Key
1. Go to **Settings** → **API Keys** → **Create API Key**
2. Choose **Restricted Access**
3. Enable only **Mail Send**
4. Copy the key

#### Step 4: Environment Variables

```env
# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
EMAIL_FROM=noreply@lasaguasproductions.com
NOTIFICATION_EMAIL=lasaguasproductions@gmail.com
```

---

## Supabase Database Changes

### Step 1: Create the Meeting Slots Table

Go to your Supabase dashboard → **SQL Editor** and run:

```sql
-- Create meeting_slots table
CREATE TABLE meeting_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Link to the lead who booked this slot
  lead_id UUID REFERENCES ad_leads_en(id) ON DELETE SET NULL,

  -- Meeting details
  meeting_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,

  -- Status tracking
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),

  -- Contact info (denormalized for easy access)
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT,

  -- Email tracking
  confirmation_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT,

  -- Ensure no double-booking
  UNIQUE(meeting_datetime)
);

-- Index for quick availability lookups
CREATE INDEX idx_meeting_slots_datetime ON meeting_slots(meeting_datetime);
CREATE INDEX idx_meeting_slots_status ON meeting_slots(status);
CREATE INDEX idx_meeting_slots_lead_id ON meeting_slots(lead_id);

-- Enable RLS
ALTER TABLE meeting_slots ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (for form submissions)
CREATE POLICY "Allow anonymous inserts" ON meeting_slots
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow anonymous to read slots (to check availability)
CREATE POLICY "Allow anonymous to read slots" ON meeting_slots
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow service role full access (for your dashboard/API)
CREATE POLICY "Service role full access" ON meeting_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Step 2: Add Meeting Reference to ad_leads_en

```sql
-- Add column to link leads to their scheduled meeting
ALTER TABLE ad_leads_en
ADD COLUMN IF NOT EXISTS meeting_slot_id UUID REFERENCES meeting_slots(id) ON DELETE SET NULL;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_ad_leads_meeting_slot ON ad_leads_en(meeting_slot_id);
```

## Code Implementation - COMPLETED

All code files have been created:

### Files Created/Modified

```
pages/
├── api/
│   └── meetings/
│       ├── book.js              ✅ Book a slot + send emails
│       └── available-slots.js   ✅ Get available slots (JS-based, not PostgreSQL)
└── forms/
    ├── digital-strategy.js      ✅ Budget-based routing added
    └── schedule-meeting.js      ✅ Calendar/scheduler UI

lib/
└── email.js                     ✅ Zoho ZeptoMail email utility
```

### How the Availability Logic Works

Instead of a PostgreSQL function, the slot generation is handled in JavaScript (`/pages/api/meetings/available-slots.js`):

- Generates all possible slots based on the rules (Mon-Thu 13-16, Fri-Sat 14-15)
- Queries Supabase for already-booked slots
- Filters out booked slots
- Returns grouped availability by date

---

## Testing Checklist

Once implemented, test these scenarios:

### Form Routing
- [ ] Budget < €280 → Shows success message + resources link
- [ ] Budget >= €280 → Redirects to scheduler page
- [ ] Lead data is saved to `ad_leads_en` in both cases

### Scheduler
- [ ] Only shows dates 2+ days in the future
- [ ] Only shows dates up to 3 weeks out
- [ ] Mon-Thu slots: 13:00, 14:00, 15:00, 16:00
- [ ] Fri-Sat slots: 14:00, 15:00
- [ ] Sunday shows no slots
- [ ] Already-booked slots don't appear
- [ ] Timezone display is correct (CET default)
- [ ] Can toggle timezone view

### Email
- [ ] User receives confirmation email
- [ ] lasaguasproductions@gmail.com receives notification
- [ ] Email contains correct date/time
- [ ] Email contains correct timezone

### Database
- [ ] `meeting_slots` row created on booking
- [ ] `ad_leads_en.meeting_slot_id` is linked
- [ ] Double-booking prevented (unique constraint)

---

## Next Steps

1. **Choose your email provider** (I recommend Zoho ZeptoMail since you're already using Zoho)
2. **Complete the DNS verification** for your chosen provider
3. **Run the SQL commands** in Supabase
4. **Let me know which email provider you chose** and I'll generate all the code files

Questions? Let me know!
