import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { resolveYachtId, parseNLPQuery } from '../services/nlpService.js';
import { sendConfirmationEmail, sendWhatsAppAPI } from '../services/notificationService.js';

const router = express.Router();

// GET /api/bookings
router.get('/', requireAuth, async (req, res) => {
  try {
    const bookingsList = await db.bookings.findMany({
      orderBy: { start_date: 'asc' }
    });

    const bookings = bookingsList.map(b => ({
      id: b.id,
      guestName: b.guest_name,
      adults: Number(b.adults),
      children: Number(b.children),
      totalGuests: Number(b.total_guests),
      yachtId: b.yacht_id,
      startDate: b.start_date.toISOString(),
      endDate: b.end_date.toISOString(),
      durationHours: Number(b.duration_hours),
      offeredHourlyRate: b.offered_hourly_rate !== null ? Number(b.offered_hourly_rate) : null,
      cateringEnabled: Boolean(b.catering_enabled),
      externalServiceCharges: Number(b.external_service_charges),
      decorationCharges: Number(b.decoration_charges || 0),
      waterSlideCharges: Number(b.water_slide_charges || 0),
      jetSkiCharges: Number(b.jet_ski_charges || 0),
      cateringCharges: Number(b.catering_charges || 0),
      otherCharges: Number(b.other_charges || 0),
      subtotal: Number(b.subtotal),
      vatRate: Number(b.vat_rate),
      vatAmount: Number(b.vat_amount),
      totalAmount: Number(b.total_amount),
      paymentMode: b.payment_mode,
      paymentAmount: Number(b.payment_amount),
      status: b.status,
      salesPerson: b.sales_person,
      createdAt: b.created_at,
      actualAdults: b.actual_adults !== null ? Number(b.actual_adults) : null,
      actualChildren: b.actual_children !== null ? Number(b.actual_children) : 0,
      actualTotalGuests: b.actual_total_guests !== null ? Number(b.actual_total_guests) : null,
      paymentCollectedBy: b.payment_collected_by,
      boardingStatus: b.boarding_status,
      guestEmail: b.guest_email,
      phoneNumber: b.phone_number
    }));

    res.json(bookings);
  } catch (err) {
    console.error("Fetch bookings error:", err);
    res.status(500).json({ error: "Could not fetch bookings log." });
  }
});

// POST /api/bookings
router.post('/', requireAuth, async (req, res) => {
  const {
    guestName, adults, children, totalGuests, yachtId, startDate, endDate, durationHours,
    offeredHourlyRate, cateringEnabled, externalServiceCharges, subtotal, vatRate, vatAmount,
    totalAmount, paymentMode, paymentAmount, status, salesPerson,
    decorationCharges, waterSlideCharges, jetSkiCharges, cateringCharges, otherCharges,
    guestEmail, phoneNumber
  } = req.body;

  try {
    // BACKEND OVERLAP RESOLUTION
    const conflict = await db.bookings.findFirst({
      where: {
        yacht_id: yachtId,
        status: { not: 'Cancelled' },
        start_date: { lt: new Date(endDate) },
        end_date: { gt: new Date(startDate) }
      }
    });

    if (conflict) {
      return res.status(409).json({
        error: `Schedule Conflict: This yacht is already booked by ${conflict.guest_name} during this time interval.`
      });
    }

    const newId = "b_" + Math.random().toString(36).substr(2, 9);
    const createdBooking = await db.bookings.create({
      data: {
        id: newId,
        guest_name: guestName,
        adults: Number(adults),
        children: Number(children),
        total_guests: Number(totalGuests),
        yacht_id: yachtId,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        duration_hours: Number(durationHours),
        offered_hourly_rate: offeredHourlyRate !== undefined && offeredHourlyRate !== null ? Number(offeredHourlyRate) : null,
        catering_enabled: Boolean(cateringCharges > 0),
        external_service_charges: Number(externalServiceCharges),
        decoration_charges: Number(decorationCharges || 0),
        water_slide_charges: Number(waterSlideCharges || 0),
        jet_ski_charges: Number(jetSkiCharges || 0),
        catering_charges: Number(cateringCharges || 0),
        other_charges: Number(otherCharges || 0),
        subtotal: Number(subtotal),
        vat_rate: Number(vatRate),
        vat_amount: Number(vatAmount),
        total_amount: Number(totalAmount),
        payment_mode: paymentMode,
        payment_amount: Number(paymentAmount),
        status,
        sales_person: salesPerson,
        created_at: new Date(),
        actual_adults: req.body.actualAdults !== undefined ? Number(req.body.actualAdults) : null,
        actual_children: req.body.actualChildren !== undefined ? Number(req.body.actualChildren) : 0,
        actual_total_guests: req.body.actualTotalGuests !== undefined ? Number(req.body.actualTotalGuests) : null,
        payment_collected_by: req.body.paymentCollectedBy || null,
        boarding_status: req.body.boardingStatus || 'Scheduled',
        guest_email: guestEmail || null,
        phone_number: phoneNumber || null
      }
    });

    // If new booking is confirmed, trigger automated communications
    if (status === 'Confirmed') {
      const yacht = await db.yachts.findUnique({ where: { id: yachtId } });
      sendConfirmationEmail(createdBooking, yacht).catch(err => console.error("[Trigger] Mail sending error:", err));
      sendWhatsAppAPI(createdBooking, yacht).catch(err => console.error("[Trigger] WhatsApp API sending error:", err));
    }

    res.status(201).json({ id: newId, guestName, totalGuests, status });
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ error: "Could not save charter booking." });
  }
});

// PUT /api/bookings/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    guestName, adults, children, totalGuests, yachtId, startDate, endDate, durationHours,
    offeredHourlyRate, cateringEnabled, externalServiceCharges, subtotal, vatRate, vatAmount,
    totalAmount, paymentMode, paymentAmount, status, salesPerson,
    decorationCharges, waterSlideCharges, jetSkiCharges, cateringCharges, otherCharges,
    guestEmail, phoneNumber
  } = req.body;

  try {
    // BACKEND OVERLAP RESOLUTION (Excluding own booking ID)
    if (status !== 'Cancelled') {
      const conflict = await db.bookings.findFirst({
        where: {
          id: { not: id },
          yacht_id: yachtId,
          status: { not: 'Cancelled' },
          start_date: { lt: new Date(endDate) },
          end_date: { gt: new Date(startDate) }
        }
      });

      if (conflict) {
        return res.status(409).json({
          error: `Schedule Conflict: This yacht is already booked by ${conflict.guest_name} during this time interval.`
        });
      }
    }

    const existing = await db.bookings.findUnique({ where: { id } });
    const becameConfirmed = status === 'Confirmed' && (!existing || existing.status !== 'Confirmed');

    const updatedBooking = await db.bookings.update({
      where: { id },
      data: {
        guest_name: guestName,
        adults: Number(adults),
        children: Number(children),
        total_guests: Number(totalGuests),
        yacht_id: yachtId,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        duration_hours: Number(durationHours),
        offered_hourly_rate: offeredHourlyRate !== undefined && offeredHourlyRate !== null ? Number(offeredHourlyRate) : null,
        catering_enabled: Boolean(cateringCharges > 0),
        external_service_charges: Number(externalServiceCharges),
        decoration_charges: Number(decorationCharges || 0),
        water_slide_charges: Number(waterSlideCharges || 0),
        jet_ski_charges: Number(jetSkiCharges || 0),
        catering_charges: Number(cateringCharges || 0),
        other_charges: Number(otherCharges || 0),
        subtotal: Number(subtotal),
        vat_rate: Number(vatRate),
        vat_amount: Number(vatAmount),
        total_amount: Number(totalAmount),
        payment_mode: paymentMode,
        payment_amount: Number(paymentAmount),
        status,
        sales_person: salesPerson,
        actual_adults: req.body.actualAdults !== undefined ? Number(req.body.actualAdults) : undefined,
        actual_children: req.body.actualChildren !== undefined ? Number(req.body.actualChildren) : undefined,
        actual_total_guests: req.body.actualTotalGuests !== undefined ? Number(req.body.actualTotalGuests) : undefined,
        payment_collected_by: req.body.paymentCollectedBy,
        boarding_status: req.body.boardingStatus,
        guest_email: guestEmail,
        phone_number: phoneNumber
      }
    });

    // If transitioned to confirmed, trigger automated communications
    if (becameConfirmed) {
      const yacht = await db.yachts.findUnique({ where: { id: yachtId } });
      sendConfirmationEmail(updatedBooking, yacht).catch(err => console.error("[Trigger] Mail sending error:", err));
      sendWhatsAppAPI(updatedBooking, yacht).catch(err => console.error("[Trigger] WhatsApp API sending error:", err));
    }

    res.json({ id, guestName, totalGuests, status });
  } catch (err) {
    console.error("Update booking error:", err);
    res.status(500).json({ error: "Could not update booking registry." });
  }
});

// PUT /api/bookings/:id/checkin
router.put('/:id/checkin', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { actualAdults, actualChildren, amountCollected, paymentMode, boardingStatus, paymentCollectedBy } = req.body;

  try {
    const booking = await db.bookings.findUnique({ where: { id } });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    const finalAdults = Number(actualAdults);
    const finalChildren = Number(actualChildren);
    const finalTotal = finalAdults + finalChildren;

    // Fetch yacht details and catering price configuration
    const yacht = await db.yachts.findUnique({ where: { id: booking.yacht_id } });
    const cateringSetting = await db.system_defaults.findUnique({ where: { key: 'cateringPricePerGuest' } });
    const cateringPrice = cateringSetting ? Number(cateringSetting.value) : 50;

    // Calculate updated yacht base cost — honour any custom offered rate
    let yachtCost = Number(booking.subtotal); // fallback to existing
    if (yacht) {
      const duration = Number(booking.duration_hours);
      const effectiveRate = booking.offered_hourly_rate !== null
        ? Number(booking.offered_hourly_rate)
        : Number(yacht.hourly_rate);
      yachtCost = duration * effectiveRate;
    }

    // Calculate updated catering fee based on actual boarding guests count
    let cateringCost = 0;
    if (booking.catering_enabled) {
      cateringCost = finalTotal * cateringPrice;
    }

    const external = Number(booking.external_service_charges);
    const newSubtotal = yachtCost + cateringCost + external;
    const vatRate = Number(booking.vat_rate);
    const newVatAmount = Math.round(newSubtotal * (vatRate / 100));
    const newTotalAmount = newSubtotal + newVatAmount;

    // Increment payment amount with whatever cash/card Captain collected
    const currentPaid = Number(booking.payment_amount);
    const addedPaid = Number(amountCollected || 0);
    const outstanding = Math.max(0, newTotalAmount - currentPaid);
    
    if (addedPaid > outstanding) {
      return res.status(400).json({ error: `Amount collected ($${addedPaid}) cannot exceed the outstanding balance ($${outstanding}).` });
    }
    
    const newPaymentAmount = currentPaid + addedPaid;

    const updated = await db.bookings.update({
      where: { id },
      data: {
        actual_adults: finalAdults,
        actual_children: finalChildren,
        actual_total_guests: finalTotal,
        boarding_status: boardingStatus || 'Boarded',
        payment_collected_by: addedPaid > 0 ? (paymentCollectedBy || 'Captain') : booking.payment_collected_by,
        payment_amount: newPaymentAmount,
        subtotal: newSubtotal,
        vat_amount: newVatAmount,
        total_amount: newTotalAmount,
        status: 'Completed',
        payment_mode: addedPaid > 0 ? (paymentMode || 'Cash') : booking.payment_mode
      }
    });

    res.json({ success: true, booking: {
      id: updated.id,
      guestName: updated.guest_name,
      actualAdults: updated.actual_adults,
      actualChildren: updated.actual_children,
      actualTotalGuests: updated.actual_total_guests,
      boardingStatus: updated.boarding_status,
      paymentAmount: Number(updated.payment_amount),
      totalAmount: Number(updated.total_amount),
      status: updated.status
    }});
  } catch (err) {
    console.error("Booking checkin error:", err);
    res.status(500).json({ error: "Failed to process captain boarding checkin." });
  }
});

// POST /api/bookings/parse-quick-add
router.post('/parse-quick-add', requireAuth, async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: "Query string is required." });
  }

  try {
    const yachts = await db.yachts.findMany();
    const parsedData = await parseNLPQuery(query, yachts);

    // Map parsed yachtName to actual database yachtId
    let matchedYachtId = yachts[0]?.id || "";
    if (parsedData.yachtName) {
      const resolved = resolveYachtId(parsedData.yachtName, yachts);
      if (resolved) {
        matchedYachtId = resolved;
      }
    } else if (parsedData.yachtId) {
      matchedYachtId = parsedData.yachtId;
    }

    // Default duration to 4 hours if missing
    const duration = Number(parsedData.durationHours) || 4;

    // Calculate End Date from Start Date and Duration
    let startDateStr = parsedData.startDate || "";
    let endDateStr = "";

    if (!startDateStr) {
      // Default to tomorrow 10:00 AM if no start date could be parsed
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      startDateStr = `${yyyy}-${mm}-${dd}T10:00`;
    }

    const startD = new Date(startDateStr);
    if (!isNaN(startD.getTime())) {
      const endD = new Date(startD.getTime() + duration * 60 * 60 * 1000);
      const yyyy = endD.getFullYear();
      const mm = String(endD.getMonth() + 1).padStart(2, '0');
      const dd = String(endD.getDate()).padStart(2, '0');
      const hh = String(endD.getHours()).padStart(2, '0');
      const min = String(endD.getMinutes()).padStart(2, '0');
      endDateStr = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }

    res.json({
      success: true,
      booking: {
        yachtId: matchedYachtId,
        guestName: parsedData.guestName || "",
        startDate: startDateStr,
        endDate: endDateStr,
        durationHours: duration,
        adults: Number(parsedData.adults) || 2,
        children: Number(parsedData.children) || 0,
        cateringEnabled: !!parsedData.cateringEnabled
      }
    });
  } catch (err) {
    console.error("Quick-Add parsing error:", err);
    res.status(500).json({ error: "Failed to parse quick-add booking description." });
  }
});

export default router;
