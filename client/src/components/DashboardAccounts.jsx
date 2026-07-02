import React, { useState } from 'react';

export default function DashboardAccounts({ bookings, yachts, salesPersons }) {
  // Report date range and filter criteria
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterSalesperson, setFilterSalesperson] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Get list of unique booking months in the dataset for dropdown filter
  const getAvailableMonths = () => {
    const months = new Set();
    bookings.forEach(b => {
      const month = b.startDate.substring(0, 7); // e.g. "2026-06"
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  };

  // Filter logic
  const filteredBookings = bookings.filter(b => {
    const bookingMonth = b.startDate.substring(0, 7);
    const matchesMonth = filterMonth === "all" || bookingMonth === filterMonth;
    const matchesSalesperson = filterSalesperson === "all" || b.salesPerson === filterSalesperson;
    
    const isFullyPaid = b.paymentAmount >= b.totalAmount;
    let matchesPayment = true;
    if (paymentFilter === "paid") matchesPayment = isFullyPaid;
    if (paymentFilter === "pending") matchesPayment = !isFullyPaid && b.paymentAmount > 0;
    if (paymentFilter === "unpaid") matchesPayment = b.paymentAmount === 0;

    return matchesMonth && matchesSalesperson && matchesPayment && b.status !== "Cancelled";
  });

  // KPI calculations
  const totalRevenue = filteredBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalCollected = filteredBookings.reduce((sum, b) => sum + b.paymentAmount, 0);
  const totalPending = totalRevenue - totalCollected;

  // Let's estimate Yacht costs vs catering to approximate a profit margin
  // For profit, let's assume catering margins are 40% and yachts are 85% profit (deducting crew/fuel costs)
  const estimatedProfit = filteredBookings.reduce((sum, b) => {
    const yachtProfit = b.yachtCost * 0.8;
    const cateringProfit = b.cateringCost * 0.35;
    const externalProfit = b.externalServiceCharges * 0.5;
    return sum + (yachtProfit + cateringProfit + externalProfit);
  }, 0);

  // Month-over-Month calculation for comparison (June 2026 vs May 2026)
  const getMoMChange = () => {
    const getMonthRevenue = (yearMonth) => {
      return bookings
        .filter(b => b.startDate.startsWith(yearMonth) && b.status !== "Cancelled")
        .reduce((sum, b) => sum + b.totalAmount, 0);
    };

    const currentMonthStr = "2026-06";
    const previousMonthStr = "2026-05";

    const currentRev = getMonthRevenue(currentMonthStr);
    const prevRev = getMonthRevenue(previousMonthStr);

    if (prevRev === 0) return { pct: 0, increase: true };
    const diff = currentRev - prevRev;
    const pct = (diff / prevRev) * 100;
    return {
      pct: Math.abs(pct).toFixed(1),
      increase: diff >= 0,
      currentVal: currentRev,
      prevVal: prevRev
    };
  };

  const momStats = getMoMChange();

  // CSV Report Generator
  const handleExportCSV = () => {
    const headers = [
      "Booking ID", "Guest Name", "Yacht", "Start Date", "End Date", 
      "Duration (Hours)", "Adults", "Children", "Subtotal ($)", 
      "VAT ($)", "VAT Rate (%)", "Total Amount ($)", "Amount Paid ($)", "Balance ($)", 
      "Status", "Sales Executive", "Payment Mode"
    ];

    const rows = filteredBookings.map(b => {
      const yacht = yachts.find(y => y.id === b.yachtId);
      return [
        b.id,
        `"${b.guestName.replace(/"/g, '""')}"`,
        yacht ? yacht.name : "Unknown",
        b.startDate,
        b.endDate,
        b.durationHours,
        b.adults,
        b.children,
        b.subtotal,
        b.vatAmount,
        b.vatRate,
        b.totalAmount,
        b.paymentAmount,
        b.totalAmount - b.paymentAmount,
        b.status,
        `"${b.salesPerson.replace(/"/g, '""')}"`,
        b.paymentMode
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `YachtFlow_Finance_Report_${filterMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart data calculations - Sales Rep performance
  const salesPerformance = salesPersons.map(rep => {
    const totalSales = bookings
      .filter(b => b.salesPerson === rep.name && b.status !== "Cancelled")
      .reduce((sum, b) => sum + b.totalAmount, 0);
    return { name: rep.name, total: totalSales };
  });
  const maxSalesVal = Math.max(...salesPerformance.map(s => s.total), 1);

  // Chart data calculations - Revenue by Yacht
  const yachtPerformance = yachts.map(y => {
    const totalSales = bookings
      .filter(b => b.yachtId === y.id && b.status !== "Cancelled")
      .reduce((sum, b) => sum + b.totalAmount, 0);
    return { name: y.name, total: totalSales };
  });
  const totalYachtRevenue = yachtPerformance.reduce((sum, y) => sum + y.total, 0) || 1;

  // Chart data calculations - Monthly Trends
  const monthlyTrends = ["2026-05", "2026-06", "2026-07"].map(m => {
    const total = bookings
      .filter(b => b.startDate.startsWith(m) && b.status !== "Cancelled")
      .reduce((sum, b) => sum + b.totalAmount, 0);
    const collected = bookings
      .filter(b => b.startDate.startsWith(m) && b.status !== "Cancelled")
      .reduce((sum, b) => sum + b.paymentAmount, 0);
    
    // Formatting month name
    const [year, month] = m.split("-");
    const monthName = new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'short' });
    return { label: `${monthName} ${year.slice(2)}`, total, collected };
  });
  const maxTrendVal = Math.max(...monthlyTrends.map(t => t.total), 1);

  return (
    <div className="flex flex-col gap-24">
      {/* KPI Cards Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrapper color-revenue">
            $
          </div>
          <div className="metric-details">
            <span className="metric-label">Total Revenue</span>
            <span className="metric-value">${totalRevenue.toLocaleString()}</span>
            <span className="metric-subtext text-success">Active Bookings Booked</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper color-collected">
            ✓
          </div>
          <div className="metric-details">
            <span className="metric-label">Cash Collected</span>
            <span className="metric-value">${totalCollected.toLocaleString()}</span>
            <span className="metric-subtext text-success" style={{ fontWeight: 500 }}>
              {totalRevenue > 0 ? ((totalCollected / totalRevenue) * 100).toFixed(0) : 0}% Liquidity
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper color-pending">
            ⏰
          </div>
          <div className="metric-details">
            <span className="metric-label">Accounts Receivable</span>
            <span className="metric-value">${totalPending.toLocaleString()}</span>
            <span className="metric-subtext text-danger">Uncollected balances</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper color-yachts">
            📈
          </div>
          <div className="metric-details">
            <span className="metric-label">Estimated Profits</span>
            <span className="metric-value">${Math.round(estimatedProfit).toLocaleString()}</span>
            <span className="metric-subtext text-success">~{totalRevenue > 0 ? ((estimatedProfit / totalRevenue) * 100).toFixed(0) : 0}% Margin estimate</span>
          </div>
        </div>
      </div>

      {/* Comparisons and Month-over-Month Audit */}
      <div className="card">
        <div className="flex justify-between align-center" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3>Month-over-Month (MoM) Growth Analysis</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Comparing June 2026 vs May 2026 bookings performance</p>
          </div>
          <div className="flex align-center gap-16" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '10px 16px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              May: <strong>${momStats.prevVal.toLocaleString()}</strong> &rarr; June: <strong>${momStats.currentVal.toLocaleString()}</strong>
            </span>
            <span className={`badge ${momStats.increase ? 'badge-success' : 'badge-danger'}`} style={{ padding: '4px 10px', fontSize: '0.85rem' }}>
              {momStats.increase ? '▲' : '▼'} {momStats.pct}% MoM
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid-3">
        {/* Monthly Cashflow Trend */}
        <div className="card">
          <h4 className="mb-24">Monthly Billings Trend</h4>
          <div className="chart-container">
            {monthlyTrends.map((trend, idx) => {
              const heightPct = (trend.total / maxTrendVal) * 90;
              const colHeightPct = (trend.collected / maxTrendVal) * 90;
              return (
                <div key={idx} className="chart-bar-wrapper">
                  <div className="flex gap-8" style={{ height: '100%', width: '100%', alignItems: 'flex-end', justifyContent: 'center' }}>
                    {/* Revenue Bar */}
                    <div className="chart-bar" style={{ height: `${heightPct}%`, backgroundColor: 'var(--brand)', maxWidth: '24px' }}>
                      <span className="chart-tooltip">${trend.total.toLocaleString()}</span>
                    </div>
                    {/* Collected Bar */}
                    <div className="chart-bar" style={{ height: `${colHeightPct}%`, backgroundColor: 'var(--success)', maxWidth: '24px' }}>
                      <span className="chart-tooltip">${trend.collected.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="chart-bar-label">{trend.label}</div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-16" style={{ justifyContent: 'center', fontSize: '0.75rem', marginTop: '12px' }}>
            <span className="legend-item"><div className="legend-color" style={{ backgroundColor: 'var(--brand)' }} /> Revenue</span>
            <span className="legend-item"><div className="legend-color" style={{ backgroundColor: 'var(--success)' }} /> Collected</span>
          </div>
        </div>

        {/* Sales Person Performance */}
        <div className="card">
          <h4 className="mb-24">Sales Representative Leaderboard</h4>
          <div className="chart-container">
            {salesPerformance.map((rep, idx) => {
              const heightPct = (rep.total / maxSalesVal) * 90;
              return (
                <div key={idx} className="chart-bar-wrapper">
                  <div className="chart-bar" style={{ height: `${heightPct}%`, backgroundColor: 'var(--info)' }}>
                    <span className="chart-tooltip">${rep.total.toLocaleString()}</span>
                  </div>
                  <div className="chart-bar-label" style={{ fontSize: '0.65rem' }}>{rep.name.split(" ")[0]}</div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px' }}>
            Total value booked per representative
          </div>
        </div>

        {/* Yacht Popularity Share */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 className="mb-24" style={{ width: '100%', textAlign: 'left' }}>Fleet Revenue Share</h4>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', width: '100%', flex: 1, justifyContent: 'center' }}>
            {/* Custom CSS conic gradient representation */}
            <div className="donut-chart-mock" style={{
              background: `conic-gradient(
                var(--brand) 0% ${(yachtPerformance[0].total / totalYachtRevenue) * 100}%,
                var(--success) ${(yachtPerformance[0].total / totalYachtRevenue) * 100}% ${((yachtPerformance[0].total + yachtPerformance[1].total) / totalYachtRevenue) * 100}%,
                var(--info) ${((yachtPerformance[0].total + yachtPerformance[1].total) / totalYachtRevenue) * 100}% ${((yachtPerformance[0].total + yachtPerformance[1].total + yachtPerformance[2].total) / totalYachtRevenue) * 100}%,
                var(--warning) ${((yachtPerformance[0].total + yachtPerformance[1].total + yachtPerformance[2].total) / totalYachtRevenue) * 100}% 100%
              )`
            }}>
              <div className="donut-chart-inner">
                ${Math.round(totalYachtRevenue / 1000)}k
              </div>
            </div>

            <div className="donut-legend">
              {yachtPerformance.map((y, idx) => {
                const colors = ['var(--brand)', 'var(--success)', 'var(--info)', 'var(--warning)'];
                const pct = ((y.total / totalYachtRevenue) * 100).toFixed(0);
                return (
                  <div key={idx} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: colors[idx] }} />
                    <span>{y.name}: <strong>{pct}%</strong></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reports Audit Register */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Accounts Ledger & Report Export</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>Compile, audit and download statements</p>
          </div>
          <div className="flex gap-16 align-center">
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="all">All Months</option>
              {getAvailableMonths().map(m => {
                const [year, month] = m.split("-");
                const monthName = new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long' });
                return <option key={m} value={m}>{monthName} {year}</option>;
              })}
            </select>

            <select value={filterSalesperson} onChange={(e) => setFilterSalesperson(e.target.value)}>
              <option value="all">All Sales Reps</option>
              {salesPersons.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>

            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="all">All Balances</option>
              <option value="paid">Fully Paid</option>
              <option value="pending">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>

            <button className="btn btn-primary" onClick={handleExportCSV}>
              🗄️ Download CSV
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Receipt ID</th>
                <th>Guest</th>
                <th>Yacht</th>
                <th>Duration</th>
                <th>Subtotal</th>
                <th>Tax (VAT)</th>
                <th>Grand Total</th>
                <th>Collected</th>
                <th>Remaining Due</th>
                <th>Sales Rep</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No ledger entries match these filter selections.
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => {
                  const y = yachts.find(yacht => yacht.id === b.yachtId);
                  const isFullyPaid = b.paymentAmount >= b.totalAmount;
                  const due = b.totalAmount - b.paymentAmount;
                  return (
                    <tr key={b.id}>
                      <td><code style={{ fontSize: '0.75rem' }}>#{b.id.toUpperCase()}</code></td>
                      <td><strong>{b.guestName}</strong></td>
                      <td>{y ? y.name : 'Unknown Yacht'}</td>
                      <td>{b.durationHours} hrs</td>
                      <td>${b.subtotal}</td>
                      <td style={{ color: 'var(--text-muted)' }}>${b.vatAmount} ({b.vatRate || 0}%)</td>
                      <td><strong>${b.totalAmount}</strong></td>
                      <td className="text-success">${b.paymentAmount}</td>
                      <td className={due > 0 ? "text-danger" : "text-success"} style={{ fontWeight: 600 }}>
                        {due > 0 ? `$${due}` : "Paid"}
                      </td>
                      <td>{b.salesPerson}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
