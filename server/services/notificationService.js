import nodemailer from 'nodemailer';
import db from '../db.js';

/**
 * Get system defaults settings for WhatsApp and other configurations
 */
async function getSystemSettings() {
  const defaults = await db.system_defaults.findMany();
  const settings = {};
  defaults.forEach(item => {
    settings[item.key] = item.value;
  });
  return settings;
}

/**
 * Compose HTML and Text content for booking confirmation email
 */
function composeBookingEmail(booking, yacht) {
  const start = new Date(booking.start_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const end = new Date(booking.end_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const subtotal = Number(booking.subtotal);
  const vatAmount = Number(booking.vat_amount);
  const totalAmount = Number(booking.total_amount);
  const paidAmount = Number(booking.payment_amount);
  const remaining = Math.max(0, totalAmount - paidAmount);

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">YachtFlow Charter Booking</h1>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.85;">Thank you for your booking!</p>
      </div>
      <div style="padding: 24px;">
        <p>Dear <strong>${booking.guest_name}</strong>,</p>
        <p>We are delighted to confirm your yacht charter booking. Below are your booking and boarding details:</p>
        
        <div style="background-color: #f8fafc; border-radius: 6px; padding: 16px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="margin-top: 0; color: #1e3a8a;">⚓ Charter Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #64748b; width: 120px;">Booking ID:</td>
              <td style="padding: 4px 0;">${booking.id}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Yacht:</td>
              <td style="padding: 4px 0;">${yacht ? yacht.name : 'SQX Yacht'} (Capacity: ${yacht ? yacht.capacity : '-'} guests)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Start Time:</td>
              <td style="padding: 4px 0;">${start}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #64748b;">End Time:</td>
              <td style="padding: 4px 0;">${end}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Duration:</td>
              <td style="padding: 4px 0;">${booking.duration_hours} Hour(s)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #64748b;">Guests:</td>
              <td style="padding: 4px 0;">${booking.adults} Adults, ${booking.children} Children</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f8fafc; border-radius: 6px; padding: 16px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #065f46;">💰 Invoice Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Subtotal:</td>
              <td style="padding: 4px 0; text-align: right;">$${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">VAT (${booking.vat_rate}%):</td>
              <td style="padding: 4px 0; text-align: right;">$${vatAmount.toFixed(2)}</td>
            </tr>
            <tr style="border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1;">
              <td style="padding: 6px 0; font-weight: bold; color: #1e293b;">Total Amount:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1e293b;">$${totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #059669; font-weight: bold;">Amount Collected:</td>
              <td style="padding: 6px 0; text-align: right; color: #059669; font-weight: bold;">$${paidAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #dc2626; font-weight: bold;">Outstanding Balance:</td>
              <td style="padding: 6px 0; text-align: right; color: #dc2626; font-weight: bold;">$${remaining.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe; font-size: 13px; color: #1e3a8a;">
          <strong>📋 Boarding Instructions:</strong> Please arrive at the marina 15 minutes before your scheduled charter start time. Ensure all guests have a valid ID.
        </div>

        <p style="margin-top: 30px; font-size: 14px;">If you have any questions or need to make adjustments to your booking, please reply directly to this email or call our team.</p>
        <p style="font-size: 14px; margin-bottom: 0;">Best regards,<br><strong>YachtFlow Reservations Team</strong></p>
      </div>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        This is an automated confirmation of your booking at YachtFlow Charter Agency.
      </div>
    </div>
  `;

  const text = `
YachtFlow Charter Booking - Confirmation

Dear ${booking.guest_name},

Thank you for your booking! We are delighted to confirm your yacht charter.

⚓ Charter Details:
- Booking ID: ${booking.id}
- Yacht: ${yacht ? yacht.name : 'SQX Yacht'}
- Start Time: ${start}
- End Time: ${end}
- Duration: ${booking.duration_hours} Hour(s)
- Guests: ${booking.adults} Adults, ${booking.children} Children

💰 Invoice Summary:
- Subtotal: $${subtotal.toFixed(2)}
- VAT: $${vatAmount.toFixed(2)}
- Total Amount: $${totalAmount.toFixed(2)}
- Amount Collected: $${paidAmount.toFixed(2)}
- Outstanding Balance: $${remaining.toFixed(2)}

📋 Boarding Instructions:
Please arrive at the marina 15 minutes before your scheduled charter start time. Ensure all guests have a valid ID.

If you have any questions or need to make adjustments, please reply to this email.

Best regards,
YachtFlow Reservations Team
  `.trim();

  return { html, text };
}

/**
 * Configure Nodemailer SMTP Transporter
 */
async function getMailTransporter() {
  // Check if SMTP environment variables are defined
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Create Ethereal test SMTP account (zero setup mock SMTP)
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (err) {
    console.warn("[Mail Service] Could not create Ethereal SMTP test account, falling back to console logger:", err.message);
    return null;
  }
}

/**
 * Send booking confirmation email to the guest
 */
export async function sendConfirmationEmail(booking, yacht) {
  if (!booking.guest_email) {
    console.log(`[Mail Service] Skip sending email for booking ${booking.id}: No guest email provided.`);
    return;
  }

  const { html, text } = composeBookingEmail(booking, yacht);
  const transporter = await getMailTransporter();

  if (!transporter) {
    console.log("====================================================================");
    console.log(`[Mail Service] SIMULATED EMAIL TO: ${booking.guest_email}`);
    console.log(`Subject: Booking Confirmation - ${booking.guest_name} (${booking.id})`);
    console.log("--------------------------------------------------------------------");
    console.log(text);
    console.log("====================================================================");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"YachtFlow Bookings" <noreply@yachtflow.co>',
      to: booking.guest_email,
      subject: `Yacht Charter Booking Confirmed - ${booking.id}`,
      text,
      html,
    });

    console.log(`[Mail Service] Email sent successfully to ${booking.guest_email}. MessageID: ${info.messageId}`);
    
    // If Ethereal test account is used, print the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Mail Service] Preview URL for Ethereal test mail: ${previewUrl}`);
    }
  } catch (err) {
    console.error(`[Mail Service] Failed to send email to ${booking.guest_email}:`, err);
  }
}

/**
 * Send booking confirmation via WhatsApp API (Meta or Twilio)
 */
export async function sendWhatsAppAPI(booking, yacht) {
  if (!booking.phone_number) {
    console.log(`[WhatsApp Service] Skip sending WhatsApp API for booking ${booking.id}: No phone number provided.`);
    return;
  }

  const settings = await getSystemSettings();
  const provider = settings.whatsappProvider || 'none';

  if (provider === 'none') {
    console.log(`[WhatsApp Service] WhatsApp API is not integrated (None selected). Fallback to client-side WhatsApp Web.`);
    return;
  }

  const start = new Date(booking.start_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const totalAmount = Number(booking.total_amount);
  const paidAmount = Number(booking.payment_amount);
  const remaining = Math.max(0, totalAmount - paidAmount);

  const messageText = `Dear *${booking.guest_name}*,

We are pleased to confirm your upcoming yacht charter with *YachtFlow*.

Here is your official voyage itinerary and booking summary:

*Voyage Details:*
- *Booking ID:* ${booking.id}
- *Yacht:* ${yacht ? yacht.name : 'SQX Yacht'}
- *Departure:* ${start}
- *Duration:* ${booking.duration_hours} hour(s)
- *Status:* [Confirmed]

*Financial Summary:*
- *Total Booking Amount:* $${totalAmount.toFixed(2)}
- *Amount Paid:* $${paidAmount.toFixed(2)}
- *Outstanding Balance:* $${remaining.toFixed(2)}

*Boarding Instructions:*
Please arrive at the marina *15 minutes prior* to your scheduled departure time. Ensure all boarding guests have valid identification documents.

Thank you for choosing YachtFlow. We look forward to welcoming you on board.

Best regards,
*YachtFlow Reservations Team*`;

  if (provider === 'meta') {
    const phoneId = settings.whatsappPhoneId;
    const token = settings.whatsappToken;
    const apiUrl = settings.whatsappApiUrl || `https://graph.facebook.com/v20.0/${phoneId}/messages`;

    if (!phoneId || !token) {
      console.error(`[WhatsApp Service] Meta Cloud API configuration missing phoneId or token.`);
      return;
    }

    try {
      console.log(`[WhatsApp Service] Sending via Meta API to ${booking.phone_number}...`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: booking.phone_number.replace(/\D/g, ''), // clean digits only
          type: "text",
          text: { body: messageText }
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(resData));
      }
      console.log(`[WhatsApp Service] Meta Cloud API message sent. ID: ${resData.messages?.[0]?.id}`);
    } catch (err) {
      console.error(`[WhatsApp Service] Meta Cloud API sending failed:`, err.message);
    }
  } else if (provider === 'twilio') {
    const token = settings.whatsappToken; // Twilio Auth Token
    const phoneId = settings.whatsappPhoneId; // Twilio Account SID
    const fromPhone = settings.whatsappApiUrl || 'whatsapp:+14155238886'; // Twilio Sandbox or Phone Number

    if (!phoneId || !token) {
      console.error(`[WhatsApp Service] Twilio configuration missing Account SID (phoneId) or Auth Token.`);
      return;
    }

    const cleanedTo = booking.phone_number.replace(/\D/g, '');
    const toPhone = `whatsapp:+${cleanedTo.startsWith('+') ? cleanedTo : cleanedTo}`;

    try {
      console.log(`[WhatsApp Service] Sending via Twilio API to ${toPhone}...`);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${phoneId}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${phoneId}:${token}`).toString('base64');
      
      const bodyParams = new URLSearchParams();
      bodyParams.append('From', fromPhone);
      bodyParams.append('To', toPhone);
      bodyParams.append('Body', messageText);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(resData));
      }
      console.log(`[WhatsApp Service] Twilio message sent successfully. SID: ${resData.sid}`);
    } catch (err) {
      console.error(`[WhatsApp Service] Twilio sending failed:`, err.message);
    }
  }
}

/**
 * Send booking thank you via WhatsApp API (Meta or Twilio) after trip completion
 */
export async function sendWhatsAppThankYouAPI(booking, yacht) {
  if (!booking.phone_number) {
    console.log(`[WhatsApp Service] Skip sending WhatsApp Thank You API for booking ${booking.id}: No phone number provided.`);
    return;
  }

  const settings = await getSystemSettings();
  const provider = settings.whatsappProvider || 'none';

  if (provider === 'none') {
    console.log(`[WhatsApp Service] WhatsApp API is not integrated (None selected) for Thank You message.`);
    return;
  }

  const messageText = `Dear *${booking.guest_name}*,

Thank you for sailing with *YachtFlow* today! We hope you and your guests had a wonderful voyage on board *${yacht ? yacht.name : 'our yacht'}*.

We look forward to welcoming you back on board soon! 🌊⛵

Best regards,
*YachtFlow Team*`;

  if (provider === 'meta') {
    const phoneId = settings.whatsappPhoneId;
    const token = settings.whatsappToken;
    const apiUrl = settings.whatsappApiUrl || `https://graph.facebook.com/v20.0/${phoneId}/messages`;

    if (!phoneId || !token) {
      console.error(`[WhatsApp Service] Meta Cloud API configuration missing phoneId or token.`);
      return;
    }

    try {
      console.log(`[WhatsApp Service] Sending Thank You via Meta API to ${booking.phone_number}...`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: booking.phone_number.replace(/\D/g, ''),
          type: "text",
          text: { body: messageText }
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(resData));
      }
      console.log(`[WhatsApp Service] Meta Cloud API Thank You message sent. ID: ${resData.messages?.[0]?.id}`);
    } catch (err) {
      console.error(`[WhatsApp Service] Meta Cloud API Thank You sending failed:`, err.message);
    }
  } else if (provider === 'twilio') {
    const token = settings.whatsappToken;
    const phoneId = settings.whatsappPhoneId;
    const fromPhone = settings.whatsappApiUrl || 'whatsapp:+14155238886';

    if (!phoneId || !token) {
      console.error(`[WhatsApp Service] Twilio configuration missing Account SID or Auth Token.`);
      return;
    }

    const cleanedTo = booking.phone_number.replace(/\D/g, '');
    const toPhone = `whatsapp:+${cleanedTo.startsWith('+') ? cleanedTo : cleanedTo}`;

    try {
      console.log(`[WhatsApp Service] Sending Thank You via Twilio API to ${toPhone}...`);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${phoneId}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${phoneId}:${token}`).toString('base64');
      
      const bodyParams = new URLSearchParams();
      bodyParams.append('From', fromPhone);
      bodyParams.append('To', toPhone);
      bodyParams.append('Body', messageText);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(resData));
      }
      console.log(`[WhatsApp Service] Twilio Thank You message sent successfully. SID: ${resData.sid}`);
    } catch (err) {
      console.error(`[WhatsApp Service] Twilio Thank You sending failed:`, err.message);
    }
  }
}

