/**
 * Validates whether a yacht booking conflicts with any existing active bookings.
 * 
 * @param {string} yachtId - The ID of the yacht being booked
 * @param {string} startDateStr - ISO format date/time string (e.g. "2026-07-01T13:00")
 * @param {string} endDateStr - ISO format date/time string (e.g. "2026-07-01T17:00")
 * @param {string|null} currentBookingId - The ID of the current booking if editing, to ignore self-comparison
 * @param {Array} bookings - The current list of bookings from database/state
 * @returns {Object|null} - Returns the conflicting booking details if an overlap exists, otherwise null.
 */
export function checkBookingConflict(yachtId, startDateStr, endDateStr, currentBookingId = null, bookings = []) {
  if (!yachtId || !startDateStr || !endDateStr) return null;

  const targetStart = new Date(startDateStr);
  const targetEnd = new Date(endDateStr);

  // Guard: end time must be after start time
  if (targetEnd <= targetStart) {
    return { error: true, message: "End time must be strictly after start time." };
  }

  // Guard: minimum booking duration (e.g. 1 hour)
  const durationMs = targetEnd - targetStart;
  if (durationMs < 30 * 60 * 1000) {
    return { error: true, message: "Minimum booking duration is 30 minutes." };
  }

  for (const booking of bookings) {
    // Ignore cancelled bookings and self when editing
    if (booking.status === "Cancelled" || (currentBookingId && booking.id === currentBookingId)) {
      continue;
    }

    if (booking.yachtId === yachtId) {
      const existStart = new Date(booking.startDate);
      const existEnd = new Date(booking.endDate);

      // Conflict logic: Start1 < End2 && Start2 < End1
      if (targetStart < existEnd && existStart < targetEnd) {
        return {
          error: true,
          message: `Conflict detected! Yacht is already booked by ${booking.guestName} (${booking.salesPerson}) from ${new Date(booking.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(booking.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on this day.`,
          conflictingBooking: booking
        };
      }
    }
  }

  return null;
}

/**
 * Automatically computes pricing components based on yacht, duration, guests, services, and optional VAT.
 */
export function calculatePricing({
  yachtRate,
  durationHours,
  totalGuests,
  cateringEnabled,
  cateringPricePerGuest,
  externalServiceCharges,
  vatRate // Can be 0, 5, or 7
}) {
  const yachtRateNum = Number(yachtRate) || 0;
  const durationNum = Number(durationHours) || 0;
  const guestsNum = Number(totalGuests) || 0;
  const cateringPriceNum = Number(cateringPricePerGuest) || 0;
  const externalNum = Number(externalServiceCharges) || 0;
  const vatRateNum = Number(vatRate) || 0;

  const yachtCost = Math.round(yachtRateNum * durationNum);
  const cateringCost = cateringEnabled ? Math.round(guestsNum * cateringPriceNum) : 0;
  const subtotal = yachtCost + cateringCost + externalNum;
  const vatAmount = Math.round(subtotal * (vatRateNum / 100));
  const totalAmount = subtotal + vatAmount;

  return {
    yachtCost,
    cateringCost,
    externalServiceCharges: externalNum,
    subtotal,
    vatRate: vatRateNum,
    vatAmount,
    totalAmount
  };
}
