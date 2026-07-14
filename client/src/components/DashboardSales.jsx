import React, { useState, useEffect } from 'react';
import { checkBookingConflict, calculatePricing } from '../bookingValidation';

export default function DashboardSales({
  bookings,
  yachts,
  salesPersons,
  currentPersona,
  onAddBooking,
  onUpdateBooking,
  systemDefaults
}) {
  // Helper to format ISO datetimes to local YYYY-MM-DDTHH:mm for inputs
  const formatToLocalDatetime = (dateInput) => {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  // Helper to get system local date in YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const todayStr = getTodayDateString();

  // Tooltip tracking states
  const [hoveredBooking, setHoveredBooking] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Filters & State
  const isReadOnly = currentPersona?.role === "accounts";
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState("");
  const [yachtFilter, setYachtFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Availability Checker form state
  const [checkYacht, setCheckYacht] = useState(yachts[0]?.id || "");
  const [checkStart, setCheckStart] = useState(`${todayStr}T10:00`);
  const [checkEnd, setCheckEnd] = useState(`${todayStr}T14:00`);
  const [checkResult, setCheckResult] = useState(null);

  // New/Edit Booking Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  
  // Form fields
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [yachtId, setYachtId] = useState(yachts[0]?.id || "");
  const [startDate, setStartDate] = useState(`${todayStr}T10:00`);
  const [endDate, setEndDate] = useState(`${todayStr}T14:00`);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [offeredHourlyRate, setOfferedHourlyRate] = useState(null); // null = use yacht default
  const [cateringEnabled, setCateringEnabled] = useState(false);
  const [externalServiceCharges, setExternalServiceCharges] = useState(0);
  const [decorationCharges, setDecorationCharges] = useState(0);
  const [waterSlideCharges, setWaterSlideCharges] = useState(0);
  const [jetSkiCharges, setJetSkiCharges] = useState(0);
  const [cateringCharges, setCateringCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Card");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [bookingStatus, setBookingStatus] = useState("Pending");
  const [salesPersonName, setSalesPersonName] = useState(currentPersona?.name || salesPersons[0]?.name || "");
  const [formError, setFormError] = useState("");
  const [vatRate, setVatRate] = useState(0); // Optional VAT (0, 5, or 7)
  const [formDuration, setFormDuration] = useState(4);

  // Natural language quick add state
  const [quickAddText, setQuickAddText] = useState("");
  const [quickAddError, setQuickAddError] = useState("");
  const [isParsingQuickAdd, setIsParsingQuickAdd] = useState(false);

  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceBooking, setInvoiceBooking] = useState(null);

  // Dynamic Timeline schedule hours configuration (defaults to 08:00 to 22:00, expands if bookings exceed range)
  const getTimelineHoursConfig = () => {
    let minHour = 8;
    let maxHour = 22;
    
    const targetStart = new Date(`${selectedDate}T00:00:00`);
    const targetEnd = new Date(`${selectedDate}T23:59:59`);
    
    bookings.forEach(b => {
      if (b.status === "Cancelled") return;
      
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      
      if (bStart < targetEnd && bEnd > targetStart) {
        let startHour = 0;
        if (bStart.toDateString() === targetStart.toDateString()) {
          startHour = bStart.getHours();
        }
        let endHour = 24;
        if (bEnd.toDateString() === targetStart.toDateString()) {
          endHour = Math.ceil(bEnd.getHours() + (bEnd.getMinutes() / 60));
        }
        
        if (startHour < minHour) {
          minHour = Math.max(0, startHour - 1);
        }
        if (endHour > maxHour) {
          maxHour = Math.min(24, endHour + 1);
        }
      }
    });
    
    const total = maxHour - minHour;
    const hours = Array.from({ length: total }, (_, i) => minHour + i);
    return { minHour, maxHour, totalHours: total, hoursArray: hours };
  };

  const { minHour: TIMELINE_START_HOUR, maxHour: TIMELINE_END_HOUR, totalHours: TIMELINE_TOTAL_HOURS, hoursArray } = getTimelineHoursConfig();

  // Set default salesperson based on current persona
  useEffect(() => {
    if (currentPersona && currentPersona.role === 'sales') {
      setSalesPersonName(currentPersona.name);
    }
  }, [currentPersona]);

  // Handle availability checker trigger
  const handleCheckAvailability = (e) => {
    e.preventDefault();
    const conflict = checkBookingConflict(
      checkYacht,
      new Date(checkStart).toISOString(),
      new Date(checkEnd).toISOString(),
      null,
      bookings
    );
    if (conflict) {
      setCheckResult({ success: false, message: conflict.message });
    } else {
      setCheckResult({ success: true, message: "Yacht is fully available for this time interval!" });
    }
  };

  // Open form for a new booking
  const handleOpenNewBooking = () => {
    setEditingBooking(null);
    setGuestName("");
    setGuestEmail("");
    setPhoneNumber("");
    setYachtId(yachts[0]?.id || "");
    const datePrefix = selectedDate;
    setStartDate(`${datePrefix}T10:00`);
    setEndDate(`${datePrefix}T14:00`);
    setAdults(2);
    setChildren(0);
    setOfferedHourlyRate(null);
    setCateringEnabled(false);
    setExternalServiceCharges(0);
    setDecorationCharges(0);
    setWaterSlideCharges(0);
    setJetSkiCharges(0);
    setCateringCharges(0);
    setOtherCharges(0);
    setPaymentMode("Card");
    setPaymentAmount(0);
    setBookingStatus("Pending");
    setVatRate(0);
    setFormDuration(4);
    setSalesPersonName(currentPersona?.name || salesPersons[0]?.name || "");
    setFormError("");
    setShowFormModal(true);
  };

  // Open form for editing a booking
  const handleOpenEditBooking = (booking) => {
    setEditingBooking(booking);
    setGuestName(booking.guestName);
    setGuestEmail(booking.guestEmail || "");
    setPhoneNumber(booking.phoneNumber || "");
    setYachtId(booking.yachtId);
    setStartDate(formatToLocalDatetime(booking.startDate));
    setEndDate(formatToLocalDatetime(booking.endDate));
    setFormDuration(booking.durationHours || 4);
    setAdults(booking.adults);
    setChildren(booking.children);
    setOfferedHourlyRate(booking.offeredHourlyRate !== null && booking.offeredHourlyRate !== undefined ? booking.offeredHourlyRate : null);
    setCateringEnabled(booking.cateringEnabled);
    setExternalServiceCharges(booking.externalServiceCharges);
    setDecorationCharges(booking.decorationCharges || 0);
    setWaterSlideCharges(booking.waterSlideCharges || 0);
    setJetSkiCharges(booking.jetSkiCharges || 0);
    setCateringCharges(booking.cateringCharges || 0);
    setOtherCharges(booking.otherCharges || 0);
    setPaymentMode(booking.paymentMode);
    setPaymentAmount(booking.paymentAmount);
    setBookingStatus(booking.status);
    setVatRate(booking.vatRate || 0);
    setSalesPersonName(booking.salesPerson);
    setFormError("");
    setShowFormModal(true);
  };

  const handleStartDateChange = (newVal) => {
    setStartDate(newVal);
    if (newVal && formDuration > 0) {
      const startD = new Date(newVal);
      if (!isNaN(startD.getTime())) {
        const endD = new Date(startD.getTime() + formDuration * 60 * 60 * 1000);
        const yyyy = endD.getFullYear();
        const mm = String(endD.getMonth() + 1).padStart(2, '0');
        const dd = String(endD.getDate()).padStart(2, '0');
        const hh = String(endD.getHours()).padStart(2, '0');
        const min = String(endD.getMinutes()).padStart(2, '0');
        setEndDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
      }
    }
  };

  const handleDurationChange = (val) => {
    const numVal = Number(val);
    setFormDuration(numVal);
    if (startDate && numVal > 0) {
      const startD = new Date(startDate);
      if (!isNaN(startD.getTime())) {
        const endD = new Date(startD.getTime() + numVal * 60 * 60 * 1000);
        const yyyy = endD.getFullYear();
        const mm = String(endD.getMonth() + 1).padStart(2, '0');
        const dd = String(endD.getDate()).padStart(2, '0');
        const hh = String(endD.getHours()).padStart(2, '0');
        const min = String(endD.getMinutes()).padStart(2, '0');
        setEndDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
      }
    }
  };

  const handleEndDateChange = (newVal) => {
    setEndDate(newVal);
    if (startDate && newVal) {
      const startD = new Date(startDate);
      const endD = new Date(newVal);
      if (!isNaN(startD.getTime()) && !isNaN(endD.getTime()) && endD > startD) {
        const diffHours = (endD - startD) / (1000 * 60 * 60);
        setFormDuration(Math.round(diffHours * 10) / 10);
      }
    }
  };

  const handleGridSlotClick = (clickedYachtId, clickedHour) => {
    if (isReadOnly) return;
    setEditingBooking(null);
    setGuestName("");
    setGuestEmail("");
    setPhoneNumber("");
    setYachtId(clickedYachtId);
    setDecorationCharges(0);
    setWaterSlideCharges(0);
    setJetSkiCharges(0);
    setCateringCharges(0);
    setOtherCharges(0);
    
    // Construct local ISO date format YYYY-MM-DDTHH:MM
    const formattedHour = String(clickedHour).padStart(2, '0');
    const startStr = `${selectedDate}T${formattedHour}:00`;
    setStartDate(startStr);
    
    // Default duration is 4 hours
    const defaultDuration = 4;
    setFormDuration(defaultDuration);
    
    const startD = new Date(startStr);
    if (!isNaN(startD.getTime())) {
      const endD = new Date(startD.getTime() + defaultDuration * 60 * 60 * 1000);
      const yyyy = endD.getFullYear();
      const mm = String(endD.getMonth() + 1).padStart(2, '0');
      const dd = String(endD.getDate()).padStart(2, '0');
      const hh = String(endD.getHours()).padStart(2, '0');
      const min = String(endD.getMinutes()).padStart(2, '0');
      setEndDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    }
    
    setAdults(2);
    setChildren(0);
    setOfferedHourlyRate(null);
    setCateringEnabled(false);
    setExternalServiceCharges(0);
    setPaymentMode("Card");
    setPaymentAmount(0);
    setBookingStatus("Pending");
    setVatRate(0);
    setSalesPersonName(currentPersona?.name || salesPersons[0]?.name || "");
    setFormError("");
    setShowFormModal(true);
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;

    setQuickAddError("");
    setIsParsingQuickAdd(true);

    try {
      const response = await fetch('/api/bookings/parse-quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: quickAddText })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to parse quick-add booking.");
      }

      const { booking } = data;
      
      // Update form state with parsed values
      setEditingBooking(null);
      setGuestName(booking.guestName || "");
      setGuestEmail("");
      setPhoneNumber("");
      setYachtId(booking.yachtId);
      setStartDate(booking.startDate);
      setEndDate(booking.endDate);
      setFormDuration(booking.durationHours || 4);
      setAdults(booking.adults || 2);
      setChildren(booking.children || 0);
      setCateringEnabled(!!booking.cateringEnabled);
      setOfferedHourlyRate(null);
      setExternalServiceCharges(0);
      setDecorationCharges(0);
      setWaterSlideCharges(0);
      setJetSkiCharges(0);
      setCateringCharges(booking.cateringEnabled ? (Number(booking.adults || 2) + Number(booking.children || 0)) * 50 : 0);
      setOtherCharges(0);
      setPaymentMode("Card");
      setPaymentAmount(0);
      setBookingStatus("Pending");
      setVatRate(0);
      setSalesPersonName(currentPersona?.name || salesPersons[0]?.name || "");
      setFormError("");
      
      // Open modal
      setShowFormModal(true);
      // Clear quick add input
      setQuickAddText("");
    } catch (err) {
      console.error("Quick add error:", err);
      setQuickAddError(err.message || "Could not parse query.");
    } finally {
      setIsParsingQuickAdd(false);
    }
  };

  const handleSendWhatsAppWeb = () => {
    if (!phoneNumber) return;
    const yacht = yachts.find(y => y.id === yachtId);
    const start = new Date(startDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const totalAmount = tempTotalAmount;
    const paidAmount = Number(paymentAmount) || 0;
    const remaining = Math.max(0, totalAmount - paidAmount);

    const messageText = `Hello ${guestName}, your yacht charter booking has been CONFIRMED.
Yacht: ${yacht ? yacht.name : 'SQX Yacht'}
Start: ${start}
Duration: ${formDuration} hour(s)
Total: $${totalAmount.toFixed(2)}
Paid: $${paidAmount.toFixed(2)}
Remaining: $${remaining.toFixed(2)}
Please arrive 15 minutes early. Thank you!`;

    const encodedText = encodeURIComponent(messageText);
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  // Handle form submission (Create or Update)
  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    // Basic Validation
    if (!guestName.trim()) {
      setFormError("Guest name is required.");
      return;
    }

    const startVal = new Date(startDate);
    const endVal = new Date(endDate);
    if (endVal <= startVal) {
      setFormError("End time must be after start time.");
      return;
    }

    // Check conflict (convert to UTC ISO strings for timezone-agnostic check)
    if (liveConflict) {
      setFormError(liveConflict.message);
      return;
    }

    // Calculate totals
    const yacht = yachts.find(y => y.id === yachtId);
    const exactHours = (endVal - startVal) / (1000 * 60 * 60);
    const totalGuests = (Number(adults) || 0) + (Number(children) || 0);

    const yachtCost = Math.round((yacht?.hourlyRate || 0) * exactHours);
    const decCost = Number(decorationCharges) || 0;
    const slideCost = Number(waterSlideCharges) || 0;
    const skiCost = Number(jetSkiCharges) || 0;
    const catCost = Number(cateringCharges) || 0;
    const othCost = Number(otherCharges) || 0;
    const subtotal = yachtCost + decCost + slideCost + skiCost + catCost + othCost;
    const vatAmount = Math.round(subtotal * (Number(vatRate) / 100));
    const totalAmount = subtotal + vatAmount;

    const bookingData = {
      guestName,
      guestEmail,
      phoneNumber,
      yachtId,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      durationHours: parseFloat(exactHours.toFixed(2)),
      adults: Number(adults) || 0,
      children: Number(children) || 0,
      totalGuests,
      cateringEnabled: catCost > 0,
      decorationCharges: decCost,
      waterSlideCharges: slideCost,
      jetSkiCharges: skiCost,
      cateringCharges: catCost,
      otherCharges: othCost,
      offeredHourlyRate: offeredHourlyRate !== null ? Number(offeredHourlyRate) : null,
      externalServiceCharges: decCost + slideCost + skiCost + othCost,
      yachtCost,
      cateringCost: catCost,
      subtotal,
      vatRate: Number(vatRate),
      vatAmount,
      totalAmount,
      paymentMode,
      paymentAmount: Number(paymentAmount),
      status: bookingStatus,
      salesPerson: salesPersonName,
      createdAt: editingBooking ? editingBooking.createdAt : new Date().toISOString()
    };

    const submitForm = async () => {
      let result;
      if (editingBooking) {
        result = await onUpdateBooking({ ...bookingData, id: editingBooking.id });
      } else {
        result = await onAddBooking(bookingData);
      }

      if (result && !result.success) {
        setFormError(result.error);
      } else {
        setShowFormModal(false);
      }
    };
    
    submitForm();
  };

  // Auto-calculated fields for visual display in form
  const selectedYacht = yachts.find(y => y.id === yachtId);
  const tempStart = new Date(startDate);
  const tempEnd = new Date(endDate);
  const tempDuration = (tempEnd > tempStart) ? (tempEnd - tempStart) / (1000 * 60 * 60) : 0;
  const tempTotalGuests = Number(adults) + Number(children);
  const effectiveRate = offeredHourlyRate !== null && offeredHourlyRate !== undefined ? Number(offeredHourlyRate) : (selectedYacht?.hourlyRate || 0);
  const yachtCost = Math.round(effectiveRate * tempDuration);
  const decCost = Number(decorationCharges) || 0;
  const slideCost = Number(waterSlideCharges) || 0;
  const skiCost = Number(jetSkiCharges) || 0;
  const catCost = Number(cateringCharges) || 0;
  const othCost = Number(otherCharges) || 0;
  const tempSubtotal = yachtCost + decCost + slideCost + skiCost + catCost + othCost;
  const tempVatAmount = Math.round(tempSubtotal * (Number(vatRate) / 100));
  const tempTotalAmount = tempSubtotal + tempVatAmount;

  // Reactively calculate booking conflicts or datetime validations
  const liveConflict = (() => {
    try {
      if (!startDate || !endDate) return null;
      return checkBookingConflict(
        yachtId,
        new Date(startDate).toISOString(),
        new Date(endDate).toISOString(),
        editingBooking?.id || null,
        bookings
      );
    } catch (e) {
      return null;
    }
  })();

  // Filter for pending or confirmed bookings whose end time has already passed on the currently selected date
  const overduePendingBookings = bookings.filter(b => {
    const isSameDay = b.startDate && b.startDate.slice(0, 10) === selectedDate;
    return (b.status === "Pending" || b.status === "Confirmed") && new Date(b.endDate) < new Date() && isSameDay;
  });

  // Filtered Bookings for the list
  const filteredBookings = bookings.filter(booking => {
    const yachtObj = yachts.find(y => y.id === booking.yachtId);
    const matchesSearch = booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          booking.salesPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (yachtObj && yachtObj.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesYacht = yachtFilter === "all" || booking.yachtId === yachtFilter;
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesYacht && matchesStatus;
  });

  // Calculate timelines display helper
  const getTimelineBookingsForYacht = (yachtId) => {
    const targetStart = new Date(`${selectedDate}T00:00:00`);
    const targetEnd = new Date(`${selectedDate}T23:59:59`);
    
    return bookings.filter(b => {
      if (b.yachtId !== yachtId || b.status === "Cancelled") return false;
      
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      
      // Overlaps with selectedDate if it starts before day end and ends after day start
      return bStart < targetEnd && bEnd > targetStart;
    });
  };

  // Convert time string "HH:MM" into visual position offsets, clamping multi-day bookings
  const getBookingBlockStyle = (booking) => {
    const bStart = new Date(booking.startDate);
    const bEnd = new Date(booking.endDate);
    
    const targetDateStart = new Date(`${selectedDate}T00:00:00`);
    const targetDateEnd = new Date(`${selectedDate}T23:59:59`);
    
    // Hide if it doesn't overlap at all
    if (bEnd <= targetDateStart || bStart >= targetDateEnd) {
      return { display: 'none' };
    }
    
    // Find hours relative to the local day bounds
    let startHour = 0;
    if (bStart.toDateString() === targetDateStart.toDateString()) {
      startHour = bStart.getHours() + (bStart.getMinutes() / 60);
    } else if (bStart < targetDateStart) {
      startHour = 0; // Starts prior to today
    }
    
    let endHour = 24;
    if (bEnd.toDateString() === targetDateStart.toDateString()) {
      endHour = bEnd.getHours() + (bEnd.getMinutes() / 60);
    } else if (bEnd > targetDateEnd) {
      endHour = 24; // Ends after today
    }
    
    // Clamp inside timeline limits (8:00 AM to 10:00 PM)
    const displayStart = Math.max(TIMELINE_START_HOUR, startHour);
    const displayEnd = Math.min(TIMELINE_END_HOUR, endHour);
    
    if (displayStart >= TIMELINE_END_HOUR || displayEnd <= TIMELINE_START_HOUR || displayEnd <= displayStart) {
      return { display: 'none' };
    }
    
    const leftPct = ((displayStart - TIMELINE_START_HOUR) / TIMELINE_TOTAL_HOURS) * 100;
    const widthPct = ((displayEnd - displayStart) / TIMELINE_TOTAL_HOURS) * 100;
    
    return {
      left: `${leftPct}%`,
      width: `${widthPct}%`
    };
  };

  const handleOpenInvoice = (booking) => {
    setInvoiceBooking(booking);
    setShowInvoiceModal(true);
  };

  return (
    <div className="flex flex-col gap-24">
      {/* Overdue Pending Bookings Alert Banner */}
      {overduePendingBookings.length > 0 && (
        <div className="card" style={{
          borderLeft: '4px solid #f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.05)',
          padding: '18px 20px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>⚠️</span>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#f59e0b', fontWeight: 700 }}>
                Overdue Enquiries & Bookings ({overduePendingBookings.length})
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                These pending or confirmed bookings were scheduled in the past but never finalized or marked as completed. Click any card to resolve.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {overduePendingBookings.map(b => {
              const yachtObj = yachts.find(y => y.id === b.yachtId);
              const isOwnBooking = b.salesPerson && currentPersona?.name && b.salesPerson.toLowerCase().trim() === currentPersona.name.toLowerCase().trim();
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    if (b.startDate) {
                      setSelectedDate(b.startDate.slice(0, 10));
                    }
                    handleOpenEditBooking(b);
                  }}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  className="overdue-item-hover"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{b.guestName}</strong>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: b.status === 'Confirmed' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: b.status === 'Confirmed' ? '#ef4444' : '#f59e0b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>{b.status === 'Confirmed' ? 'Overdue Booking' : 'Overdue Enquiry'}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⛵</span>
                      <strong>{yachtObj?.name || 'Unknown Yacht'}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⏰</span>
                      <span>{new Date(b.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(b.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '8px',
                      marginTop: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.72rem'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        👤 {b.salesPerson}
                        {isOwnBooking && (
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            background: 'var(--brand)',
                            color: '#fff',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            marginLeft: '4px'
                          }}>Me</span>
                        )}
                      </span>
                      <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Update Status →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* Scheduler Timeline Map */}
      <div className="card">
        <div className="flex justify-between align-center mb-24" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="flex align-center gap-16">
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Yacht Availability:</span>
            <div className="date-navigator" style={{ margin: 0 }}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ fontWeight: 600, padding: '4px 10px', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-main)' }}
              />
            </div>
          </div>
          {!isReadOnly && (
            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={handleOpenNewBooking}>
              + Create New Booking
            </button>
          )}
        </div>
        <div className="timeline-grid">
          {/* Header Hours Row */}
          <div className="timeline-hours">
            <div className="timeline-yacht-label" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Yacht Name</div>
            <div className="timeline-slots">
              {hoursArray.map((hour, idx) => (
                <div key={idx} className="timeline-slot-hour">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Yacht Rows */}
          {yachts.map(yacht => {
            const yachtBookings = getTimelineBookingsForYacht(yacht.id);
            return (
              <div key={yacht.id} className="timeline-row">
                <div className="timeline-yacht-label">
                  <div>
                    <div>{yacht.name}</div>
                    <small style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Cap: {yacht.capacity}</small>
                  </div>
                </div>
                <div className="timeline-slots">
                  {/* Visual Background grid lines */}
                  {hoursArray.map((hour, idx) => (
                    <div 
                      key={idx} 
                      className={`timeline-slot-hour ${isReadOnly ? '' : 'clickable-slot'}`} 
                      onClick={() => handleGridSlotClick(yacht.id, hour)}
                      title={isReadOnly ? undefined : `Book ${yacht.name} starting at ${hour.toString().padStart(2, '0')}:00`}
                      style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
                    />
                  ))}
                  
                  {/* Booked Blocks */}
                  {yachtBookings.map(b => {
                    const blockStyle = getBookingBlockStyle(b);
                    let statusClass = "bg-booking-confirmed";
                    if (b.status === "Pending") statusClass = "bg-booking-pending";
                    if (b.status === "Completed") statusClass = "bg-booking-completed";
                    
                    const formattedTimeStr = new Date(b.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
                                             " - " + 
                                             new Date(b.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div
                        key={b.id}
                        className={`timeline-booking-block ${statusClass}`}
                        style={blockStyle}
                        onClick={(e) => { e.stopPropagation(); handleOpenEditBooking(b); }}
                        onMouseEnter={(e) => {
                          setHoveredBooking(b);
                          setTooltipPos({ x: e.clientX, y: e.clientY - 120 });
                        }}
                        onMouseMove={(e) => {
                          setTooltipPos({ x: e.clientX, y: e.clientY - 120 });
                        }}
                        onMouseLeave={() => setHoveredBooking(null)}
                      >
                        <div className="timeline-booking-label">
                          <strong style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{b.guestName}</strong>
                          <span style={{ display: 'block', fontSize: '0.65rem', opacity: 0.9, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            👤 {b.salesPerson}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-16 mt-24" style={{ justifyContent: 'center' }}>
          <div className="legend-item"><div className="legend-color bg-booking-pending" /> Pending</div>
          <div className="legend-item"><div className="legend-color bg-booking-confirmed" /> Confirmed</div>
          <div className="legend-item"><div className="legend-color bg-booking-completed" /> Completed</div>
        </div>
      </div>

      {/* Quick Availability Checker & Info */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Quick Conflict Checker</h3>
          </div>
          <form onSubmit={handleCheckAvailability} className="flex flex-col gap-16">
            <div className="form-group">
              <label>Select Yacht</label>
              <select value={checkYacht} onChange={(e) => setCheckYacht(e.target.value)}>
                {yachts.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Start Date/Time</label>
                <input
                  type="datetime-local"
                  value={checkStart}
                  onChange={(e) => setCheckStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>End Date/Time</label>
                <input
                  type="datetime-local"
                  value={checkEnd}
                  onChange={(e) => setCheckEnd(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-secondary">Run Conflict Audit</button>
            
            {checkResult && (
              <div className={`badge ${checkResult.success ? 'badge-success' : 'badge-danger'}`} style={{ padding: '10px', borderRadius: '6px', display: 'block', textAlign: 'center', fontWeight: 500 }}>
                {checkResult.message}
              </div>
            )}
          </form>
        </div>

        {/* Dynamic Rates Guide */}
        <div className="card">
          <div className="card-header">
            <h3>Yacht Fleet Pricing Guide</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Yacht Details</th>
                  <th>Capacity</th>
                  <th>Hourly Rate</th>
                </tr>
              </thead>
              <tbody>
                {yachts.map(y => (
                  <tr key={y.id}>
                    <td>
                      <strong>{y.name}</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{y.description}</p>
                    </td>
                    <td>{y.capacity} max guests</td>
                    <td><strong className="text-success">${y.hourlyRate}/hr</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bookings Register */}
      <div className="card">
        <div className="card-header">
          <h3>Active Yacht Bookings Registry</h3>
          <div className="flex gap-16 align-center">
            <input
              type="text"
              placeholder="Search guest or sales exec..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '220px' }}
            />
            <select value={yachtFilter} onChange={(e) => setYachtFilter(e.target.value)}>
              <option value="all">All Yachts</option>
              {yachts.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Yacht</th>
                <th>Time Window</th>
                <th>Pax (Est vs Act)</th>
                <th>Total Bill</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Sales Rep</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No bookings found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => {
                  const y = yachts.find(yacht => yacht.id === b.yachtId);
                  const isFullyPaid = b.paymentAmount >= b.totalAmount;
                  const formattedStart = new Date(b.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) + " " +
                                         new Date(b.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const formattedEnd = new Date(b.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  let badgeClass = "badge-info";
                  if (b.status === "Pending") badgeClass = "badge-warning";
                  if (b.status === "Completed") badgeClass = "badge-success";
                  if (b.status === "Cancelled") badgeClass = "badge-danger";

                  const isBoarded = b.boardingStatus === "Boarded" || b.boardingStatus === "Completed";

                  return (
                    <tr key={b.id}>
                      <td><strong>{b.guestName}</strong></td>
                      <td>{y ? y.name : 'Unknown Yacht'}</td>
                      <td>
                        <div>{formattedStart}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to {formattedEnd} ({b.durationHours} hrs)</div>
                      </td>
                      <td>
                        <div>{b.adults}A + {b.children}C</div>
                        {isBoarded && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500 }}>
                            Act: {b.actualAdults}A + {b.actualChildren}C
                          </div>
                        )}
                      </td>
                      <td><strong>${b.totalAmount}</strong></td>
                      <td className={isFullyPaid ? "text-success" : "text-danger"}>
                        ${b.paymentAmount}
                        {b.paymentCollectedBy && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            by {b.paymentCollectedBy}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{b.status}</span>
                      </td>
                      <td>{b.salesPerson}</td>
                      <td>
                        <div className="flex gap-8">
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleOpenEditBooking(b)}>
                            {isReadOnly ? "Details" : "Edit"}
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleOpenInvoice(b)}>
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOOKING CREATE/EDIT MODAL FORM */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingBooking ? "Modify Booking Info" : "Register Yacht Booking"}</h3>
              <button className="close-btn" onClick={() => setShowFormModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="badge badge-danger mb-24" style={{ display: 'block', padding: '8px 12px', borderRadius: '4px', textAlign: 'center' }}>
                    {formError}
                  </div>
                )}

                {/* Row 1: Guest Name + Yacht + Rate */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr minmax(120px, 160px)', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Guest Name *</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Martha Wayne"
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Yacht *</label>
                    <select value={yachtId} onChange={(e) => {
                      setYachtId(e.target.value);
                      setOfferedHourlyRate(null); // reset custom rate when yacht changes
                    }} disabled={isReadOnly}>
                      {yachts.map(y => (
                        <option key={y.id} value={y.id}>{y.name} (Max {y.capacity})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>
                      Rate/hr ($)
                      {selectedYacht && offeredHourlyRate !== null && Number(offeredHourlyRate) !== selectedYacht.hourlyRate && (
                        <span style={{ color: 'var(--warning, #f59e0b)', fontSize: '0.7rem', marginLeft: '6px', fontWeight: 600 }}>✎ Custom</span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={offeredHourlyRate !== null ? offeredHourlyRate : (selectedYacht?.hourlyRate || '')}
                      onChange={(e) => setOfferedHourlyRate(e.target.value === '' ? null : Number(e.target.value))}
                      disabled={isReadOnly}
                      placeholder={selectedYacht ? `Std: $${selectedYacht.hourlyRate}` : ''}
                      style={offeredHourlyRate !== null && selectedYacht && Number(offeredHourlyRate) !== selectedYacht.hourlyRate
                        ? { borderColor: '#f59e0b', color: '#f59e0b' }
                        : {}}
                    />
                    {selectedYacht && offeredHourlyRate !== null && Number(offeredHourlyRate) !== selectedYacht.hourlyRate && (
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        Std: ${selectedYacht.hourlyRate}/hr
                        <button type="button" onClick={() => setOfferedHourlyRate(null)} style={{ marginLeft: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.7rem', textDecoration: 'underline' }}>Reset</button>
                      </small>
                    )}
                  </div>
                </div>

                {/* Row 1.5: Guest Email + Guest Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Guest Email</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="e.g. martha.wayne@example.com"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Phone Number</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. +1234567890"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                {/* Row 2: Start Date/Time + Duration + End Date/Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(90px, 130px) 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Duration (hrs)</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={formDuration}
                      onChange={(e) => handleDurationChange(e.target.value)}
                      disabled={isReadOnly}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                {liveConflict && (
                  <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    marginBottom: '12px',
                    lineHeight: '1.4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '1rem' }}>⚠️</span>
                    <span>{liveConflict.message}</span>
                  </div>
                )}

                {/* Row 3: Adults + Children + Booking Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 100px) minmax(80px, 100px) 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Adults</label>
                    <input
                      type="number"
                      min="1"
                      value={adults}
                      onChange={(e) => setAdults(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Children</label>
                    <input
                      type="number"
                      min="0"
                      value={children}
                      onChange={(e) => setChildren(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Booking Status</label>
                    <select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)} disabled={isReadOnly}>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>


                {/* Additional Services — 3 columns */}
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    Additional Services & Charges
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Decoration ($)</label>
                      <input type="number" min="0" value={decorationCharges} onChange={(e) => setDecorationCharges(e.target.value === '' ? '' : Number(e.target.value))} disabled={isReadOnly} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Water Slide ($)</label>
                      <input type="number" min="0" value={waterSlideCharges} onChange={(e) => setWaterSlideCharges(e.target.value === '' ? '' : Number(e.target.value))} disabled={isReadOnly} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Jet Ski ($)</label>
                      <input type="number" min="0" value={jetSkiCharges} onChange={(e) => setJetSkiCharges(e.target.value === '' ? '' : Number(e.target.value))} disabled={isReadOnly} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Catering ($)</label>
                      <input type="number" min="0" value={cateringCharges} onChange={(e) => setCateringCharges(e.target.value === '' ? '' : Number(e.target.value))} disabled={isReadOnly} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Other Service ($)</label>
                      <input type="number" min="0" value={otherCharges} onChange={(e) => setOtherCharges(e.target.value === '' ? '' : Number(e.target.value))} disabled={isReadOnly} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>VAT Rate</label>
                      <select value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} disabled={isReadOnly}>
                        <option value="0">No VAT (0%)</option>
                        <option value="5">VAT 5%</option>
                        <option value="7">VAT 7%</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dynamic Booking Statement + Payment side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                  {/* Quote summary */}
                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Booking Statement</h4>
                    <div className="flex flex-col gap-8" style={{ fontSize: '0.85rem' }}>
                      <div className="flex justify-between">
                        <span>
                          Yacht Charter ({selectedYacht?.name}
                          {offeredHourlyRate !== null && selectedYacht && Number(offeredHourlyRate) !== selectedYacht.hourlyRate ? (
                            <>
                              {' '}@ <span style={{ color: '#f59e0b', fontWeight: 600 }}>${effectiveRate}/hr</span>
                              <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: '4px', fontSize: '0.8rem' }}>${selectedYacht.hourlyRate}</span>
                            </>
                          ) : (
                            ` @ $${effectiveRate}/hr`
                          )}
                          {` × ${tempDuration.toFixed(1)}h`}):
                        </span>
                        <span>${yachtCost}</span>
                      </div>
                      {decCost > 0 && <div className="flex justify-between"><span>Decoration:</span><span>${decCost}</span></div>}
                      {slideCost > 0 && <div className="flex justify-between"><span>Water Slide:</span><span>${slideCost}</span></div>}
                      {skiCost > 0 && <div className="flex justify-between"><span>Jet Ski:</span><span>${skiCost}</span></div>}
                      {catCost > 0 && <div className="flex justify-between"><span>Catering:</span><span>${catCost}</span></div>}
                      {othCost > 0 && <div className="flex justify-between"><span>Other:</span><span>${othCost}</span></div>}
                      <div className="flex justify-between" style={{ fontWeight: 500, borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                        <span>Subtotal:</span><span>${tempSubtotal}</span>
                      </div>
                      <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                        <span>VAT ({vatRate}%):</span><span>${tempVatAmount}</span>
                      </div>
                      <div className="flex justify-between" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        <span>Grand Total:</span><span>${tempTotalAmount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment */}
                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Payment</h4>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label>Payment Method</label>
                      <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} disabled={isReadOnly}>
                        <option value="Card">Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Online">Online</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Amount Collected ($)</label>
                      <input
                        type="number"
                        min="0"
                        max={tempTotalAmount}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        disabled={isReadOnly}
                      />
                      <small style={{ color: 'var(--text-muted)' }}>
                        Remaining: ${tempTotalAmount - (Number(paymentAmount) || 0)}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ alignItems: 'center' }}>
                {/* Salesperson — far left */}
                <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sales by:</span>
                  {currentPersona?.role === "admin" ? (
                    <select
                      value={salesPersonName}
                      onChange={(e) => setSalesPersonName(e.target.value)}
                      disabled={isReadOnly}
                      style={{ padding: '4px 8px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-main)' }}
                    >
                      {salesPersons.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      <option value="Office">Office</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{salesPersonName || currentPersona?.name}</span>
                  )}
                </div>
                {!isReadOnly && editingBooking && bookingStatus !== "Cancelled" && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setBookingStatus("Cancelled");
                      setFormError("Status set to Cancelled. Hit Update to save.");
                    }}
                  >
                    Cancel Booking
                  </button>
                )}
                 {isReadOnly && bookingStatus === "Confirmed" && phoneNumber && (
                   <button
                     type="button"
                     className="btn"
                     onClick={handleSendWhatsAppWeb}
                     style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                   >
                     💬 Send via WhatsApp Web
                   </button>
                 )}
                 <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>
                   Close
                 </button>
                 {!isReadOnly && (
                  <button type="submit" className="btn btn-primary">
                    {editingBooking ? "Update Booking" : "Confirm Booking"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED INVOICE / RECEIPT MODAL */}
      {showInvoiceModal && invoiceBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Invoice / Booking Receipt</h3>
              <button className="close-btn" onClick={() => setShowInvoiceModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="invoice-container">
                <div className="invoice-header">
                  <div>
                    <h2 style={{ fontSize: '1.4rem', border: 'none', margin: 0 }}>YachtFlow Ltd.</h2>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Premium Yacht Charters</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h4 style={{ margin: 0 }}>Booking #{invoiceBooking.id.toUpperCase()}</h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Date: {new Date(invoiceBooking.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>Guest Details</h4>
                  <div className="invoice-row"><span>Guest Name:</span><strong>{invoiceBooking.guestName}</strong></div>
                  <div className="invoice-row"><span>Total Guests:</span><span>{invoiceBooking.totalGuests} ({invoiceBooking.adults} Adults, {invoiceBooking.children} Kids)</span></div>
                  <div className="invoice-row"><span>Sales Consultant:</span><span>{invoiceBooking.salesPerson}</span></div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>Itinerary Info</h4>
                  <div className="invoice-row">
                    <span>Yacht Deck:</span>
                    <strong>{(yachts.find(y => y.id === invoiceBooking.yachtId))?.name}</strong>
                  </div>
                  <div className="invoice-row"><span>Start Time:</span><span>{new Date(invoiceBooking.startDate).toLocaleString()}</span></div>
                  <div className="invoice-row"><span>End Time:</span><span>{new Date(invoiceBooking.endDate).toLocaleString()}</span></div>
                  <div className="invoice-row"><span>Duration:</span><span>{invoiceBooking.durationHours} Hours</span></div>
                </div>

                <div>
                  <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>Billing Summary</h4>
                  <div className="invoice-row">
                    <span>Yacht Base Fee:</span>
                    <span>${invoiceBooking.yachtCost}</span>
                  </div>
                  {Number(invoiceBooking.cateringCharges) > 0 && (
                    <div className="invoice-row">
                      <span>Catering Service Fee:</span>
                      <span>${Number(invoiceBooking.cateringCharges)}</span>
                    </div>
                  )}
                  {Number(invoiceBooking.decorationCharges) > 0 && (
                    <div className="invoice-row">
                      <span>Decoration Charges:</span>
                      <span>${Number(invoiceBooking.decorationCharges)}</span>
                    </div>
                  )}
                  {Number(invoiceBooking.waterSlideCharges) > 0 && (
                    <div className="invoice-row">
                      <span>Water Slide Charges:</span>
                      <span>${Number(invoiceBooking.waterSlideCharges)}</span>
                    </div>
                  )}
                  {Number(invoiceBooking.jetSkiCharges) > 0 && (
                    <div className="invoice-row">
                      <span>Jet Ski Charges:</span>
                      <span>${Number(invoiceBooking.jetSkiCharges)}</span>
                    </div>
                  )}
                  {Number(invoiceBooking.otherCharges) > 0 && (
                    <div className="invoice-row">
                      <span>Other Service Charges:</span>
                      <span>${Number(invoiceBooking.otherCharges)}</span>
                    </div>
                  )}
                  {!(invoiceBooking.decorationCharges > 0 || invoiceBooking.waterSlideCharges > 0 || invoiceBooking.jetSkiCharges > 0 || invoiceBooking.otherCharges > 0) && Number(invoiceBooking.externalServiceCharges) > 0 && (
                    <div className="invoice-row">
                      <span>External Service Fee:</span>
                      <span>${Number(invoiceBooking.externalServiceCharges)}</span>
                    </div>
                  )}
                  <div className="invoice-row" style={{ fontWeight: 500, borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                    <span>Subtotal:</span>
                    <span>${invoiceBooking.subtotal}</span>
                  </div>
                  <div className="invoice-row" style={{ color: '#64748b' }}>
                    <span>VAT ({invoiceBooking.vatRate || 0}%):</span>
                    <span>${invoiceBooking.vatAmount || 0}</span>
                  </div>
                  <div className="invoice-row invoice-total">
                    <span>Total Bill:</span>
                    <span>${invoiceBooking.totalAmount}</span>
                  </div>
                  
                  <div className="invoice-row" style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <span>Amount Paid ({invoiceBooking.paymentMode}):</span>
                    <span className="text-success" style={{ fontWeight: 'bold' }}>${invoiceBooking.paymentAmount}</span>
                  </div>
                  <div className="invoice-row">
                    <span>Outstanding Balance:</span>
                    <span className={invoiceBooking.totalAmount - invoiceBooking.paymentAmount > 0 ? "text-danger" : "text-success"} style={{ fontWeight: 'bold' }}>
                      ${invoiceBooking.totalAmount - invoiceBooking.paymentAmount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => window.print()}>
                Print Receipt
              </button>
              <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED VIEWPORT TOOLTIP TO PREVENT CLIPPING */}
      {hoveredBooking && (
        <div 
          className="timeline-booking-fixed-tooltip"
          style={{
            position: 'fixed',
            top: `${tooltipPos.y}px`,
            left: `${tooltipPos.x}px`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 99999
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--brand)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px' }}>
            Booking Details
          </div>
          <div style={{ marginBottom: '4px' }}><strong>Guest:</strong> {hoveredBooking.guestName}</div>
          <div style={{ marginBottom: '4px' }}><strong>Created By:</strong> {hoveredBooking.salesPerson}</div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Interval:</strong> {new Date(hoveredBooking.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(hoveredBooking.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({hoveredBooking.durationHours} hrs)
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Boarding:</strong> <span className={`badge ${hoveredBooking.boardingStatus === "Boarded" ? "badge-info" : hoveredBooking.boardingStatus === "Completed" ? "badge-success" : "badge-warning"}`}>{hoveredBooking.boardingStatus || "Scheduled"}</span>
          </div>
          {hoveredBooking.actualTotalGuests !== null && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Boarded Count:</strong> {hoveredBooking.actualAdults} A + {hoveredBooking.actualChildren} C
            </div>
          )}
          {hoveredBooking.paymentCollectedBy && (
            <div style={{ marginBottom: '4px', color: 'var(--success)' }}>
              <strong>Paid:</strong> ${hoveredBooking.paymentAmount} (collected by {hoveredBooking.paymentCollectedBy})
            </div>
          )}
          <div><strong>Status:</strong> <span className={`badge ${hoveredBooking.status === "Pending" ? "badge-warning" : hoveredBooking.status === "Completed" ? "badge-success" : "badge-info"}`}>{hoveredBooking.status}</span></div>
        </div>
      )}
    </div>
  );
}
