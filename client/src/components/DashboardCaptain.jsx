import React, { useState } from 'react';

export default function DashboardCaptain({
  bookings,
  yachts,
  currentPersona,
  onCheckinBooking,
  systemDefaults
}) {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actualAdults, setActualAdults] = useState(2);
  const [actualChildren, setActualChildren] = useState(0);
  const [amountCollected, setAmountCollected] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const getDynamicPricing = () => {
    if (!selectedBooking) return { totalAmount: 0, outstandingBalance: 0, cateringCost: 0, subtotal: 0, vatAmount: 0 };
    
    const yachtObj = yachts.find(y => y.id === selectedBooking.yachtId);
    const hourlyRate = yachtObj ? Number(yachtObj.hourlyRate) : 0;
    const duration = Number(selectedBooking.durationHours);
    const yachtCost = duration * hourlyRate;
    
    const totalGuests = Number(actualAdults) + Number(actualChildren);
    const cateringPrice = systemDefaults ? Number(systemDefaults.cateringPricePerGuest) : 50;
    const cateringCost = selectedBooking.cateringEnabled ? (totalGuests * cateringPrice) : 0;
    
    const external = Number(selectedBooking.externalServiceCharges) || 0;
    const subtotal = yachtCost + cateringCost + external;
    const vatRate = Number(selectedBooking.vatRate) || 0;
    const vatAmount = Math.round(subtotal * (vatRate / 100));
    const totalAmount = subtotal + vatAmount;
    
    const outstandingBalance = Math.max(0, totalAmount - Number(selectedBooking.paymentAmount));
    return {
      totalAmount,
      outstandingBalance,
      cateringCost,
      subtotal,
      vatAmount
    };
  };

  const dynamicPricing = getDynamicPricing();
  const isOverpaid = Number(amountCollected) > dynamicPricing.outstandingBalance;

  // Helper to format ISO datetimes to local date strings YYYY-MM-DD
  const getLocalDateString = (isoString) => {
    const d = new Date(isoString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayDateString();

  // Filter bookings scheduled for today
  const todaysBookings = bookings.filter(b => {
    const bDate = getLocalDateString(b.startDate);
    return bDate === todayStr && b.status !== "Cancelled";
  });

  const handleOpenCheckin = (booking) => {
    setSelectedBooking(booking);
    setActualAdults(booking.actualAdults !== null ? booking.actualAdults : booking.adults);
    setActualChildren(booking.actualChildren !== null ? booking.actualChildren : booking.children);
    setAmountCollected(0);
    setPaymentMode("Cash");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleConfirmCheckin = async (e) => {
    e.preventDefault();
    if (actualAdults < 0 || actualChildren < 0) {
      setErrorMessage("Guest counts cannot be negative numbers.");
      return;
    }

    const outstanding = dynamicPricing.outstandingBalance;
    if (Number(amountCollected) > outstanding) {
      setErrorMessage(`Amount collected ($${amountCollected}) cannot exceed the outstanding balance ($${outstanding}).`);
      return;
    }

    const payload = {
      actualAdults: Number(actualAdults),
      actualChildren: Number(actualChildren),
      amountCollected: dynamicPricing.outstandingBalance > 0 ? Number(amountCollected) : 0,
      paymentMode: dynamicPricing.outstandingBalance > 0 ? paymentMode : "Cash",
      boardingStatus: "Completed",
      paymentCollectedBy: currentPersona?.name || "Captain"
    };

    const result = await onCheckinBooking(selectedBooking.id, payload);
    if (result && result.success) {
      setSuccessMessage("Trip successfully marked as Completed!");
      setTimeout(() => {
        setSelectedBooking(null);
        setSuccessMessage("");
      }, 1500);
    } else {
      setErrorMessage(result?.error || "Failed to update boarding check-in.");
    }
  };

  return (
    <div className="captain-dashboard">
      <div className="flex justify-between align-center mb-24" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Captain's Boarding Log</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            Hello, <strong>{currentPersona?.name}</strong>. Log boarding guest counts and payments for today's yacht charters.
          </p>
        </div>
        <div className="badge badge-info" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
          Today: {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Today's Scheduled Charters ({todaysBookings.length})</h3>
        </div>

        {todaysBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>⚓</span>
            <strong>No yacht charters scheduled for today.</strong>
            <p style={{ fontSize: '0.85rem', margin: '6px 0 0' }}>Check back later or contact your sales executive.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Yacht</th>
                  <th>Guest Name</th>
                  <th>Time Slot</th>
                  <th>Estimated Guests</th>
                  <th>Actual Arrived</th>
                  <th>Financials</th>
                  <th>Boarding Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {todaysBookings.map(b => {
                  const yachtObj = yachts.find(y => y.id === b.yachtId);
                  const isBoarded = b.boardingStatus === "Boarded" || b.boardingStatus === "Completed";
                  const outstandingBalance = b.totalAmount - b.paymentAmount;
                  
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600, color: 'var(--brand)' }}>
                        {yachtObj ? yachtObj.name : "Unknown Yacht"}
                      </td>
                      <td>
                        <strong>{b.guestName}</strong>
                      </td>
                      <td>
                        {new Date(b.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>{b.adults} Adults, {b.children} Kids</span>
                      </td>
                      <td>
                        {isBoarded ? (
                          <span className="badge badge-success" style={{ fontWeight: 500 }}>
                            {b.actualAdults} Adults, {b.actualChildren} Kids
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Awaiting Boarding</span>
                        )}
                      </td>
                      <td>
                        <div>Total: <strong>${b.totalAmount}</strong></div>
                        <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                          Paid: <span className="text-success">${b.paymentAmount}</span> | Bal: <span className={outstandingBalance > 0 ? "text-danger" : "text-success"}>${outstandingBalance}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${b.boardingStatus === "Boarded" ? "badge-info" : b.boardingStatus === "Completed" ? "badge-success" : "badge-warning"}`}>
                          {b.boardingStatus || "Scheduled"}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className={`btn ${isBoarded ? "btn-secondary" : "btn-primary"}`}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleOpenCheckin(b)}
                        >
                          {isBoarded ? "✏️ Update Details" : "⚓ Complete Trip"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CHECK-IN MODAL */}
      {selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>⚓ Verify & Complete Trip</h3>
              <button className="close-btn" onClick={() => setSelectedBooking(null)}>×</button>
            </div>
            <form onSubmit={handleConfirmCheckin}>
              <div className="modal-body">
                {errorMessage && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 500 }}>
                    ⚠️ {errorMessage}
                  </div>
                )}
                {successMessage && (
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 500 }}>
                    ✔️ {successMessage}
                  </div>
                )}

                 <div style={{ marginBottom: '16px', backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Charter Yacht: <strong>{(yachts.find(y => y.id === selectedBooking.yachtId))?.name}</strong></div>
                  <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Lead Guest: <strong>{selectedBooking.guestName}</strong></div>
                  <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>Sales Representative: <strong>{selectedBooking.salesPerson}</strong></div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Amount</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>${dynamicPricing.totalAmount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid to Sales</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)' }}>${selectedBooking.paymentAmount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To Be Collected</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand)' }}>${dynamicPricing.outstandingBalance}</div>
                    </div>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Verify Guest Headcount</h4>
                
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label>Actual Boarded Adults</label>
                    <input 
                      type="number" 
                      min="0"
                      value={actualAdults} 
                      onChange={(e) => setActualAdults(e.target.value)} 
                      required 
                    />
                    <small style={{ color: 'var(--text-muted)' }}>Estimated: {selectedBooking.adults}</small>
                  </div>
                  <div className="form-group">
                    <label>Actual Boarded Kids</label>
                    <input 
                      type="number" 
                      min="0"
                      value={actualChildren} 
                      onChange={(e) => setActualChildren(e.target.value)} 
                      required 
                    />
                    <small style={{ color: 'var(--text-muted)' }}>Estimated: {selectedBooking.children}</small>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Payment Collected On-Board</h4>
                
                {dynamicPricing.outstandingBalance > 0 ? (
                  <>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label style={{ color: isOverpaid ? 'var(--danger)' : 'inherit' }}>Amount Collected ($)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={amountCollected} 
                        onChange={(e) => setAmountCollected(e.target.value)} 
                        placeholder="Enter amount to collect"
                        style={{ borderColor: isOverpaid ? 'var(--danger)' : 'inherit' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginTop: '4px', gap: '8px' }}>
                        <small style={{ color: 'var(--text-muted)' }}>
                          Outstanding Balance: <strong>${dynamicPricing.outstandingBalance}</strong>
                        </small>
                        {isOverpaid && (
                          <small style={{ color: 'var(--danger)', fontWeight: 600, marginLeft: 'auto' }}>
                            ⚠️ Exceeds outstanding balance!
                          </small>
                        )}
                      </div>
                    </div>

                    {Number(amountCollected) > 0 && !isOverpaid && (
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label>Payment Method</label>
                        <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                          <option value="Cash">Cash</option>
                          <option value="Card">On-Board Card Terminal</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 16px' }}>
                    ✔️ Full payment already collected by Sales. No collection required.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedBooking(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!!successMessage || isOverpaid}>
                  ⚓ Confirm Trip Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
