import React, { useState, useEffect, useCallback } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');

const formatDateLabel = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const isToday = target.getTime() === today.getTime();
  const isTomorrow = target.getTime() === today.getTime() + 86400000;
  const base = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  if (isToday) return `Today · ${base}`;
  if (isTomorrow) return `Tomorrow · ${base}`;
  return base;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const addDays = (dateStr, delta) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Compute which hours are occupied for a given booking on a given date
const getOccupiedHours = (booking, dateStr) => {
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  const dayEnd = dayStart + 86400000;
  const bStart = new Date(booking.startDate).getTime();
  const bEnd = new Date(booking.endDate).getTime();
  if (bEnd <= dayStart || bStart >= dayEnd) return [];

  const effectiveStart = Math.max(bStart, dayStart);
  const effectiveEnd = Math.min(bEnd, dayEnd);

  const hours = [];
  for (let h = 0; h < 24; h++) {
    const slotStart = dayStart + h * 3600000;
    const slotEnd = slotStart + 3600000;
    if (effectiveStart < slotEnd && effectiveEnd > slotStart) {
      hours.push(h);
    }
  }
  return hours;
};

// ─── Booking Detail Sheet ───────────────────────────────────────────────────

function BookingSheet({ booking, yachtName, onClose }) {
  if (!booking) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px', margin: '0 auto',
          background: 'var(--bg-secondary)', borderRadius: '16px 16px 0 0',
          padding: '24px 20px 32px', boxShadow: '0 -8px 40px rgba(0,0,0,0.3)'
        }}
      >
        {/* Handle */}
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border-color)', margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem'
          }}>⛵</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{yachtName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Booking Details</div>
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: 'var(--text-muted)' }}
          >×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Row label="⏰ Time" value={`${fmtTime(booking.startDate)} → ${fmtTime(booking.endDate)}`} />
          <Row label="👥 Guests" value={`${booking.adults + booking.children} total (${booking.adults} adults, ${booking.children} children)`} />
          <Row label="📋 Status">
            <span style={{
              padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
              background: booking.status === 'Confirmed' ? 'rgba(16,185,129,0.15)' : booking.status === 'Pending' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
              color: booking.status === 'Confirmed' ? '#10b981' : booking.status === 'Pending' ? '#f59e0b' : '#818cf8'
            }}>{booking.status}</span>
          </Row>
          <Row label="🕐 Duration" value={`${booking.durationHours}h`} />
        </div>

        <div style={{
          marginTop: '20px', padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(99,102,241,0.08)', fontSize: '0.8rem', color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          This yacht is <strong style={{ color: 'var(--danger, #ef4444)' }}>not available</strong> during this time slot.
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{label}</span>
      {children || <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{value}</span>}
    </div>
  );
}

// ─── Hour Legend Bar ─────────────────────────────────────────────────────────

const HOUR_RANGE = { start: 6, end: 24 }; // 06:00 to 00:00

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
      <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: color, flexShrink: 0 }} />
      {label}
    </div>
  );
}

// ─── Yacht Row ───────────────────────────────────────────────────────────────

function YachtRow({ yacht, bookings, dateStr, onBookingTap }) {
  const yachtBookings = bookings.filter(
    (b) => b.yachtId === yacht.id && b.status !== 'Cancelled'
  );

  const totalSlots = HOUR_RANGE.end - HOUR_RANGE.start;

  // Build slot occupancy map: hour -> booking | null
  const occupancyMap = {};
  for (let h = HOUR_RANGE.start; h < HOUR_RANGE.end; h++) occupancyMap[h] = null;
  yachtBookings.forEach((b) => {
    getOccupiedHours(b, dateStr).forEach((h) => {
      if (h >= HOUR_RANGE.start && h < HOUR_RANGE.end) occupancyMap[h] = b;
    });
  });

  const isAllFree = Object.values(occupancyMap).every((v) => v === null);
  const isAllBooked = Object.values(occupancyMap).every((v) => v !== null);

  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: '12px',
      padding: '14px', marginBottom: '10px',
      border: '1px solid var(--border-color)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
    }}>
      {/* Yacht header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{yacht.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Cap: {yacht.capacity} · ${yacht.hourlyRate}/hr
          </div>
        </div>
        {isAllFree && (
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px',
            background: 'rgba(16,185,129,0.15)', color: '#10b981', letterSpacing: '0.3px'
          }}>✓ FREE ALL DAY</span>
        )}
        {isAllBooked && (
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px',
            background: 'rgba(239,68,68,0.15)', color: '#ef4444', letterSpacing: '0.3px'
          }}>✗ FULLY BOOKED</span>
        )}
      </div>

      {/* Hour bar */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', minWidth: `${totalSlots * 28}px`, gap: '2px' }}>
          {Array.from({ length: totalSlots }, (_, i) => {
            const hour = HOUR_RANGE.start + i;
            const booking = occupancyMap[hour];
            const isBooked = !!booking;

            // Determine if this is the start of a booked block
            const prevBooked = hour > HOUR_RANGE.start && !!occupancyMap[hour - 1];
            const showLabel = isBooked && !prevBooked;

            return (
              <div
                key={hour}
                onClick={() => isBooked && onBookingTap(booking)}
                title={isBooked ? `${pad(hour)}:00 — Booked` : `${pad(hour)}:00 — Available`}
                style={{
                  flex: 1,
                  height: '34px',
                  borderRadius: '4px',
                  cursor: isBooked ? 'pointer' : 'default',
                  background: isBooked
                    ? booking.status === 'Pending' ? 'rgba(245,158,11,0.75)' : 'rgba(239,68,68,0.72)'
                    : 'rgba(16,185,129,0.18)',
                  border: isBooked ? 'none' : '1px solid rgba(16,185,129,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  color: isBooked ? 'white' : 'rgba(16,185,129,0.7)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.15s',
                  position: 'relative'
                }}
              >
                {/* Show time label only at the start of booked blocks */}
                {showLabel && (
                  <span style={{ fontSize: '0.52rem', opacity: 0.9 }}>{pad(hour)}:00</span>
                )}
                {/* Show hour number on free slots */}
                {!isBooked && (
                  <span style={{ fontSize: '0.5rem' }}>{pad(hour)}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Hour axis labels */}
        <div style={{ display: 'flex', minWidth: `${totalSlots * 28}px`, gap: '2px', marginTop: '3px' }}>
          {Array.from({ length: totalSlots }, (_, i) => {
            const hour = HOUR_RANGE.start + i;
            return (
              <div key={hour} style={{
                flex: 1, textAlign: 'center', fontSize: '0.5rem',
                color: 'var(--text-muted)',
                visibility: hour % 2 === 0 ? 'visible' : 'hidden'
              }}>
                {pad(hour)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AgentAvailability({ onLogout }) {
  const [yachts, setYachts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedYachtName, setSelectedYachtName] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [yachtsRes, bookingsRes] = await Promise.all([
        fetch('/api/yachts').then((r) => r.json()),
        fetch('/api/bookings').then((r) => r.json()),
      ]);
      setYachts(Array.isArray(yachtsRes) ? yachtsRes : []);
      setBookings(Array.isArray(bookingsRes) ? bookingsRes : []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Agent data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePrev = () => setSelectedDate((d) => addDays(d, -1));
  const handleNext = () => setSelectedDate((d) => addDays(d, 1));
  const handleToday = () => setSelectedDate(todayStr());

  const handleBookingTap = (booking) => {
    const yacht = yachts.find((y) => y.id === booking.yachtId);
    setSelectedYachtName(yacht?.name || '');
    setSelectedBooking(booking);
  };

  // Count free / booked yachts for the summary pill
  const isYachtFreeOnDate = (yacht) => {
    return bookings
      .filter((b) => b.yachtId === yacht.id && b.status !== 'Cancelled')
      .every((b) => getOccupiedHours(b, selectedDate).length === 0);
  };
  const freeCount = yachts.filter(isYachtFreeOnDate).length;
  const bookedCount = yachts.length - freeCount;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '520px',
      margin: '0 auto',
      padding: '0 0 40px',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '0.85rem'
          }}>YF</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1 }}>YachtFlow</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Availability Checker</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: 'transparent', border: '1px solid var(--border-color)',
            borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
            fontSize: '0.75rem', color: 'var(--text-muted)'
          }}
        >Sign Out</button>
      </div>

      {/* ── Date navigator ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <button
          onClick={handlePrev}
          style={{
            width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer',
            border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
            fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >‹</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatDateLabel(selectedDate)}</div>
          {selectedDate !== todayStr() && (
            <button onClick={handleToday} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.7rem', color: 'var(--brand)', textDecoration: 'underline', marginTop: '2px'
            }}>Go to Today</button>
          )}
        </div>

        <button
          onClick={handleNext}
          style={{
            width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer',
            border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
            fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >›</button>
      </div>

      {/* ── Summary pills ── */}
      {!loading && (
        <div style={{
          display: 'flex', gap: '8px', padding: '10px 16px',
          background: 'var(--bg-primary)',
        }}>
          <div style={{
            flex: 1, textAlign: 'center', padding: '8px', borderRadius: '10px',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)'
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{freeCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Available</div>
          </div>
          <div style={{
            flex: 1, textAlign: 'center', padding: '8px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)'
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{bookedCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Booked</div>
          </div>
          <div style={{
            flex: 1, textAlign: 'center', padding: '8px', borderRadius: '10px',
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)'
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand)' }}>{yachts.length}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Fleet</div>
          </div>
        </div>
      )}

      {/* ── Fleet grid ── */}
      <div style={{ padding: '8px 12px', flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⛵</div>
            <p>Loading fleet availability…</p>
          </div>
        ) : (
          yachts.map((yacht) => (
            <YachtRow
              key={yacht.id}
              yacht={yacht}
              bookings={bookings}
              dateStr={selectedDate}
              onBookingTap={handleBookingTap}
            />
          ))
        )}
      </div>

      {/* ── Legend + refresh ── */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        position: 'sticky', bottom: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <LegendItem color="rgba(16,185,129,0.3)" label="Available" />
          <LegendItem color="rgba(245,158,11,0.75)" label="Pending" />
          <LegendItem color="rgba(239,68,68,0.72)" label="Confirmed / Booked" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            style={{
              background: 'none', border: '1px solid var(--border-color)',
              borderRadius: '6px', padding: '4px 12px', cursor: 'pointer',
              fontSize: '0.72rem', color: 'var(--text-muted)'
            }}
          >🔄 Refresh</button>
        </div>
      </div>

      {/* ── Booking detail bottom sheet ── */}
      {selectedBooking && (
        <BookingSheet
          booking={selectedBooking}
          yachtName={selectedYachtName}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}
