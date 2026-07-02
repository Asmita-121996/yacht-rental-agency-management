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
  // Filters & State
  const isReadOnly = currentPersona?.role === "accounts";
  const [selectedDate, setSelectedDate] = useState("2026-07-01");
  const [searchQuery, setSearchQuery] = useState("");
  const [yachtFilter, setYachtFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Availability Checker form state
  const [checkYacht, setCheckYacht] = useState(yachts[0]?.id || "");
  const [checkStart, setCheckStart] = useState("2026-07-01T10:00");
  const [checkEnd, setCheckEnd] = useState("2026-07-01T14:00");
  const [checkResult, setCheckResult] = useState(null);

  // New/Edit Booking Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  
  // Form fields
  const [guestName, setGuestName] = useState("");
  const [yachtId, setYachtId] = useState(yachts[0]?.id || "");
  const [startDate, setStartDate] = useState("2026-07-01T10:00");
  const [endDate, setEndDate] = useState("2026-07-01T14:00");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pickupLocation, setPickupLocation] = useState("");
  const [cateringEnabled, setCateringEnabled] = useState(false);
  const [externalServiceCharges, setExternalServiceCharges] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Card");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [bookingStatus, setBookingStatus] = useState("Pending");
  const [salesPersonName, setSalesPersonName] = useState(currentPersona?.name || salesPersons[0]?.name || "");
  const [formError, setFormError] = useState("");
  const [vatRate, setVatRate] = useState(0); // Optional VAT (0, 5, or 7)

  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceBooking, setInvoiceBooking] = useState(null);

  // Timeline schedule hours configuration (08:00 to 22:00)
  const TIMELINE_START_HOUR = 8;
  const TIMELINE_END_HOUR = 22;
  const TIMELINE_TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
  const hoursArray = Array.from({ length: TIMELINE_TOTAL_HOURS + 1 }, (_, i) => TIMELINE_START_HOUR + i);

  // Set default salesperson based on current persona
  useEffect(() => {
    if (currentPersona && currentPersona.role === 'sales') {
      setSalesPersonName(currentPersona.name);
    }
  }, [currentPersona]);

  // Handle availability checker trigger
  const handleCheckAvailability = (e) => {
    e.preventDefault();
    const conflict = checkBookingConflict(checkYacht, checkStart, checkEnd, null, bookings);
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
    setYachtId(yachts[0]?.id || "");
    const datePrefix = selectedDate;
    setStartDate(`${datePrefix}T10:00`);
    setEndDate(`${datePrefix}T14:00`);
    setAdults(2);
    setChildren(0);
    setPickupLocation("");
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

  // Open form for editing a booking
  const handleOpenEditBooking = (booking) => {
    setEditingBooking(booking);
    setGuestName(booking.guestName);
    setYachtId(booking.yachtId);
    setStartDate(booking.startDate);
    setEndDate(booking.endDate);
    setAdults(booking.adults);
    setChildren(booking.children);
    setPickupLocation(booking.pickupLocation);
    setCateringEnabled(booking.cateringEnabled);
    setExternalServiceCharges(booking.externalServiceCharges);
    setPaymentMode(booking.paymentMode);
    setPaymentAmount(booking.paymentAmount);
    setBookingStatus(booking.status);
    setVatRate(booking.vatRate || 0);
    setSalesPersonName(booking.salesPerson);
    setFormError("");
    setShowFormModal(true);
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
    if (!pickupLocation.trim()) {
      setFormError("Pickup location is required.");
      return;
    }

    const startVal = new Date(startDate);
    const endVal = new Date(endDate);
    if (endVal <= startVal) {
      setFormError("End time must be after start time.");
      return;
    }

    // Check conflict
    const conflict = checkBookingConflict(yachtId, startDate, endDate, editingBooking?.id || null, bookings);
    if (conflict) {
      setFormError(conflict.message);
      return;
    }

    // Calculate totals
    const yacht = yachts.find(y => y.id === yachtId);
    const durationHours = Math.max(0.5, (endVal - startVal) / (3000 * 1200)); // (1000 * 60 * 60)
    const exactHours = (endVal - startVal) / (1000 * 60 * 60);
    const totalGuests = adults + children;

    const pricing = calculatePricing({
      yachtRate: yacht?.hourlyRate || 0,
      durationHours: exactHours,
      totalGuests,
      cateringEnabled,
      cateringPricePerGuest: systemDefaults.cateringPricePerGuest,
      externalServiceCharges: Number(externalServiceCharges) || 0,
      vatRate: vatRate
    });

    const bookingData = {
      guestName,
      yachtId,
      startDate,
      endDate,
      durationHours: parseFloat(exactHours.toFixed(2)),
      adults: Number(adults),
      children: Number(children),
      totalGuests,
      pickupLocation,
      cateringEnabled,
      externalServiceCharges: Number(externalServiceCharges),
      ...pricing,
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
  const computedPricing = calculatePricing({
    yachtRate: selectedYacht?.hourlyRate || 0,
    durationHours: tempDuration,
    totalGuests: tempTotalGuests,
    cateringEnabled,
    cateringPricePerGuest: systemDefaults.cateringPricePerGuest,
    externalServiceCharges: Number(externalServiceCharges) || 0,
    vatRate: vatRate
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
    return bookings.filter(b => {
      if (b.yachtId !== yachtId || b.status === "Cancelled") return false;
      const bDate = b.startDate.split("T")[0];
      return bDate === selectedDate;
    });
  };

  // Convert time string "HH:MM" into visual position offsets
  const getBookingBlockStyle = (booking) => {
    const bStart = new Date(booking.startDate);
    const bEnd = new Date(booking.endDate);
    
    const startHour = bStart.getHours() + (bStart.getMinutes() / 60);
    const endHour = bEnd.getHours() + (bEnd.getMinutes() / 60);
    
    // Clamp inside timeline limits
    const displayStart = Math.max(TIMELINE_START_HOUR, startHour);
    const displayEnd = Math.min(TIMELINE_END_HOUR, endHour);
    
    if (displayStart >= TIMELINE_END_HOUR || displayEnd <= TIMELINE_START_HOUR) {
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
      {/* Date Navigation & Actions */}
      <div className="scheduler-header card">
        <div className="flex align-center gap-16">
          <h2 style={{ border: 'none', margin: 0 }}>Yacht Scheduler</h2>
          <div className="date-navigator">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ fontWeight: 600 }}
            />
          </div>
        </div>
        {!isReadOnly && (
          <button className="btn btn-primary" onClick={handleOpenNewBooking}>
            + Create New Booking
          </button>
        )}
      </div>

      {/* Scheduler Timeline Map */}
      <div className="card">
        <div className="flex justify-between align-center mb-24" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Visual Occupancy Grid ({new Date(selectedDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })})</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>Shared workspace: showing live availability across all sales representatives</p>
          </div>
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
                  {hoursArray.map((_, idx) => (
                    <div key={idx} className="timeline-slot-hour" style={{ pointerEvents: 'none' }} />
                  ))}
                  
                  {/* Booked Blocks */}
                  {yachtBookings.map(b => {
                    const blockStyle = getBookingBlockStyle(b);
                    let statusClass = "bg-booking-confirmed";
                    if (b.status === "Pending") statusClass = "bg-booking-pending";
                    if (b.status === "Completed") statusClass = "bg-booking-completed";
                    
                    return (
                      <div
                        key={b.id}
                        className={`timeline-booking-block ${statusClass}`}
                        style={blockStyle}
                        onClick={() => handleOpenEditBooking(b)}
                        title={`Guest: ${b.guestName} | Representative: ${b.salesPerson} | Duration: ${b.durationHours} hrs`}
                      >
                        {b.guestName} ({b.salesPerson})
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
                <th>Pax</th>
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

                  return (
                    <tr key={b.id}>
                      <td><strong>{b.guestName}</strong></td>
                      <td>{y ? y.name : 'Unknown Yacht'}</td>
                      <td>
                        <div>{formattedStart}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to {formattedEnd} ({b.durationHours} hrs)</div>
                      </td>
                      <td>{b.adults}A + {b.children}C</td>
                      <td><strong>${b.totalAmount}</strong></td>
                      <td className={isFullyPaid ? "text-success" : "text-danger"}>
                        ${b.paymentAmount}
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
                <div className="form-grid">
                  <div className="form-group full-width">
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

                  <div className="form-group">
                    <label>Yacht *</label>
                    <select value={yachtId} onChange={(e) => setYachtId(e.target.value)} disabled={isReadOnly}>
                      {yachts.map(y => (
                        <option key={y.id} value={y.id}>{y.name} (Max {y.capacity})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Pickup Location *</label>
                    <input
                      type="text"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder="e.g. Pier 15"
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="form-group">
                    <label>Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="form-group">
                    <label>Adult Count</label>
                    <input
                      type="number"
                      min="1"
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="form-group">
                    <label>Child Count</label>
                    <input
                      type="number"
                      min="0"
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="form-group">
                    <label>Salesperson *</label>
                    {currentPersona?.role === "sales" ? (
                      <input
                        type="text"
                        value={currentPersona.name}
                        disabled
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                      />
                    ) : (
                      <select value={salesPersonName} onChange={(e) => setSalesPersonName(e.target.value)} disabled={isReadOnly}>
                        {salesPersons.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Booking Status</label>
                    <select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)} disabled={isReadOnly}>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid mb-24" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={cateringEnabled}
                        onChange={(e) => setCateringEnabled(e.target.checked)}
                        disabled={isReadOnly}
                      />
                      Add Catering Service
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Catering charge: ${systemDefaults.cateringPricePerGuest} / guest
                    </span>
                  </div>

                  <div className="form-group">
                    <label>External Services Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={externalServiceCharges}
                      onChange={(e) => setExternalServiceCharges(Number(e.target.value))}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="form-group">
                    <label>Apply VAT Tax Rate</label>
                    <select value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} disabled={isReadOnly}>
                      <option value="0">No VAT (0%)</option>
                      <option value="5">VAT 5%</option>
                      <option value="7">VAT 7%</option>
                    </select>
                  </div>
                </div>

                {/* Dynamically calculated Quote */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 className="mb-24">Dynamic Booking Statement</h4>
                  <div className="flex flex-col gap-8" style={{ fontSize: '0.9rem' }}>
                    <div className="flex justify-between">
                      <span>Yacht Charter ({selectedYacht?.name} @ ${selectedYacht?.hourlyRate}/hr x {tempDuration.toFixed(2)} hrs):</span>
                      <span>${computedPricing.yachtCost}</span>
                    </div>
                    {cateringEnabled && (
                      <div className="flex justify-between">
                        <span>Catering Buffet ({tempTotalGuests} guests @ ${systemDefaults.cateringPricePerGuest}/head):</span>
                        <span>${computedPricing.cateringCost}</span>
                      </div>
                    )}
                    {Number(externalServiceCharges) > 0 && (
                      <div className="flex justify-between">
                        <span>External / Custom Charges:</span>
                        <span>${computedPricing.externalServiceCharges}</span>
                      </div>
                    )}
                    <div className="flex justify-between" style={{ fontWeight: 500 }}>
                      <span>Subtotal:</span>
                      <span>${computedPricing.subtotal}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                      <span>VAT ({vatRate}%):</span>
                      <span>${computedPricing.vatAmount}</span>
                    </div>
                    <div className="flex justify-between" style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      <span>Grand Total:</span>
                      <span>${computedPricing.totalAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Payment logging */}
                <div className="form-grid mt-24" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} disabled={isReadOnly}>
                      <option value="Card">Card</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount Collected ($)</label>
                    <input
                      type="number"
                      min="0"
                      max={computedPricing.totalAmount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      disabled={isReadOnly}
                    />
                    <small style={{ color: 'var(--text-muted)' }}>
                      Remaining balance: ${computedPricing.totalAmount - paymentAmount}
                    </small>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {!isReadOnly && editingBooking && bookingStatus !== "Cancelled" && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ marginRight: 'auto' }}
                    onClick={() => {
                      setBookingStatus("Cancelled");
                      setFormError("Status set to Cancelled. Hit Update to save.");
                    }}
                  >
                    Cancel Booking
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
                  <div className="invoice-row"><span>Pickup Location:</span><span>{invoiceBooking.pickupLocation}</span></div>
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
                  {invoiceBooking.cateringEnabled && (
                    <div className="invoice-row">
                      <span>Catering Service:</span>
                      <span>${invoiceBooking.cateringCost}</span>
                    </div>
                  )}
                  {invoiceBooking.externalServiceCharges > 0 && (
                    <div className="invoice-row">
                      <span>External Service Fee:</span>
                      <span>${invoiceBooking.externalServiceCharges}</span>
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
    </div>
  );
}
