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

  const handleExportCSV = () => {
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      const day = date.getDate();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = String(date.getFullYear()).substring(2);
      return `${day}/${month}/${year}`;
    };

    const formatTimeRange = (startStr, endStr) => {
      if (!startStr || !endStr) return "";
      const s = new Date(startStr);
      const e = new Date(endStr);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return "";
      const pad = (num) => String(num).padStart(2, '0');
      return `${pad(s.getHours())}:${pad(s.getMinutes())}-${pad(e.getHours())}:${pad(e.getMinutes())}`;
    };

    const escapeCsvCell = (val) => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "Invoice #", "Date", "Payment Mode", "Sales Staff", "Services", "Sales Head", "Time", "Ledger", "Booking from", "Touris Details", "", "Adult/qty", "Adult Rate", "AdultAmount", "Child", "ChildRate", "ChildAmount", "Total Pax", "GrossAmount", "VAT(5%)", "TotalAmount", "Remarks", "Comm", "Supplier Payment Details", "Ref#", "Supplier 1", "Rate", "Adult", "Child2", "Qty", "SupplierAmount", "Supplier 2", "Supplier Amount", "OperatingCost", "Profit", "Remarks2", "", "Sales Narration"
    ];

    const rows = [];

    // Title Row
    const titleRow = Array(38).fill("");
    titleRow[0] = `Silver Queen Yacht - Sales Report for the Month of ${filterMonth}`;
    rows.push(titleRow);
    rows.push(Array(38).fill("")); // separator

    // Headers Row
    rows.push(headers);

    let totalQty = 0;
    let totalGross = 0;
    let totalVat = 0;
    let totalAmountSum = 0;
    let totalProfit = 0;

    filteredBookings.forEach(b => {
      const yacht = yachts.find(y => y.id === b.yachtId);
      const yachtCost = b.durationHours * (yacht ? yacht.hourlyRate : 0);
      const yachtVat = Math.round(yachtCost * (b.vatRate / 100));
      const yachtTotal = yachtCost + yachtVat;

      totalQty += b.adults + b.children;
      totalGross += yachtCost;
      totalVat += yachtVat;
      totalAmountSum += yachtTotal;
      totalProfit += yachtCost;

      // 1. Yacht Rental row
      rows.push([
        b.id,
        formatDate(b.startDate),
        `${b.paymentMode} ${b.paymentAmount}/-`,
        b.salesPerson,
        `${yacht ? yacht.name : "SQ"} - Yacht Rental`,
        `Sales - ${yacht ? yacht.name : "Yacht"}`,
        formatTimeRange(b.startDate, b.endDate),
        `${b.salesPerson === 'Office' ? 'Customer (Office)' : b.salesPerson + ' Sales'} - A/R`,
        b.guestName,
        `${b.durationHours}-Hours Yacht Trip`,
        "",
        b.adults,
        yacht ? yacht.hourlyRate : 0,
        yachtCost.toFixed(2),
        b.children || "",
        "",
        "",
        b.adults + b.children,
        yachtCost.toFixed(2),
        yachtVat.toFixed(2),
        yachtTotal.toFixed(2),
        "",
        "-",
        "", "", "", "", "", "", "", "", "", "", "",
        yachtCost.toFixed(2),
        "", "", ""
      ]);

      const pushServiceRow = (serviceName, detailText, chargeVal) => {
        if (chargeVal <= 0) return;
        const svcVat = Math.round(chargeVal * (b.vatRate / 100));
        const svcTotal = chargeVal + svcVat;

        totalQty += 1;
        totalGross += chargeVal;
        totalVat += svcVat;
        totalAmountSum += svcTotal;
        totalProfit += chargeVal;

        rows.push([
          "",
          formatDate(b.startDate),
          "",
          b.salesPerson,
          serviceName,
          `Sales - ${yacht ? yacht.name : "Yacht"}`,
          "",
          `${b.salesPerson === 'Office' ? 'Customer (Office)' : b.salesPerson + ' Sales'} - A/R`,
          b.guestName,
          detailText,
          "",
          1,
          chargeVal,
          chargeVal.toFixed(2),
          "", "", "",
          1,
          chargeVal.toFixed(2),
          svcVat.toFixed(2),
          svcTotal.toFixed(2),
          "",
          "-",
          "", "", "", "", "", "", "", "", "", "", "",
          chargeVal.toFixed(2),
          "", "", ""
        ]);
      };

      // 2. Decoration row
      pushServiceRow("Balloon Decoration", "Decoration Arranged", b.decorationCharges || 0);

      // 3. Water Slide row
      pushServiceRow("Water Slide Rental", "Water Slide", b.waterSlideCharges || 0);

      // 4. Jet Ski row
      pushServiceRow("Jet Ski Rental", "1 Hour Jet Ski", b.jetSkiCharges || 0);

      // 5. Catering row
      const cateringVal = b.cateringCharges > 0 
        ? Number(b.cateringCharges) 
        : (b.cateringEnabled ? (b.adults + b.children) * 50 : 0);
      
      if (cateringVal > 0) {
        const cateringCost = cateringVal;
        const cateringVat = Math.round(cateringCost * (b.vatRate / 100));
        const cateringTotal = cateringCost + cateringVat;

        totalQty += b.adults + b.children;
        totalGross += cateringCost;
        totalVat += cateringVat;
        totalAmountSum += cateringTotal;
        totalProfit += cateringCost;

        rows.push([
          "",
          formatDate(b.startDate),
          "",
          b.salesPerson,
          "Catering (Food)",
          `Sales - ${yacht ? yacht.name : "Yacht"}`,
          "",
          `${b.salesPerson === 'Office' ? 'Customer (Office)' : b.salesPerson + ' Sales'} - A/R`,
          b.guestName,
          "Food Arranged",
          "",
          b.adults + b.children,
          (cateringCost / (b.adults + b.children || 1)).toFixed(2),
          cateringCost.toFixed(2),
          "", "", "",
          b.adults + b.children,
          cateringCost.toFixed(2),
          cateringVat.toFixed(2),
          cateringTotal.toFixed(2),
          "",
          "-",
          "", "", "", "", "", "", "", "", "", "", "",
          cateringCost.toFixed(2),
          "", "", ""
        ]);
      }

      // 6. Other Service row
      pushServiceRow("Other Service", "Additional services", b.otherCharges || 0);

      // 7. Backward compatibility for externalServiceCharges
      const hasSpecificCharges = (b.decorationCharges > 0 || b.waterSlideCharges > 0 || b.jetSkiCharges > 0 || b.otherCharges > 0);
      if (!hasSpecificCharges && b.externalServiceCharges > 0) {
        pushServiceRow("External Service / Add-ons", "Additional services", b.externalServiceCharges);
      }

      // 4. Separator row
      rows.push([
        "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "0:00", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
      ]);
    });

    // Add Grand Totals Row
    const totalRow = Array(38).fill("");
    totalRow[11] = totalQty;
    totalRow[13] = totalGross.toFixed(2);
    totalRow[17] = totalQty;
    totalRow[18] = totalGross.toFixed(2);
    totalRow[19] = totalVat.toFixed(2);
    totalRow[20] = totalAmountSum.toFixed(2);
    totalRow[34] = totalProfit.toFixed(2);
    rows.push(totalRow);

    // Spacer rows
    rows.push(Array(38).fill(""));
    rows.push(Array(38).fill(""));

    // Sales staff performance
    const salesHeader1 = Array(38).fill("");
    salesHeader1[4] = "SQ-V";
    salesHeader1[5] = "SQ-X";
    salesHeader1[6] = "Charter";
    salesHeader1[7] = "Yacht";
    salesHeader1[8] = "Alcohol";
    rows.push(salesHeader1);

    const salesHeader2 = Array(38).fill("");
    salesHeader2[4] = "Sales Staff";
    salesHeader2[5] = "SQ-V";
    salesHeader2[6] = "SQ-X";
    salesHeader2[7] = "CTR";
    salesHeader2[8] = "YCH";
    salesHeader2[9] = "ALC";
    salesHeader2[11] = "Total Sales";
    salesHeader2[12] = "%";
    salesHeader2[13] = "Incentive (5%)";
    rows.push(salesHeader2);

    const grandTotalSales = filteredBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0) || 1;

    salesPersons.forEach(rep => {
      const repBookings = filteredBookings.filter(b => b.salesPerson === rep.name);
      const repSales = repBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
      const repPct = ((repSales / grandTotalSales) * 100).toFixed(0) + "%";
      const repIncentive = (repSales * 0.05).toFixed(2);

      const repRow = Array(38).fill("");
      repRow[4] = rep.name;
      repRow[5] = "-";
      repRow[6] = "-";
      repRow[7] = "-";
      repRow[8] = "-";
      repRow[9] = "-";
      repRow[11] = repSales.toFixed(2);
      repRow[12] = repPct;
      repRow[13] = repIncentive;
      rows.push(repRow);
    });

    // Accounts Ledger Table
    rows.push(Array(38).fill(""));
    rows.push(Array(38).fill(""));

    const ledgerTitleRow = Array(38).fill("");
    ledgerTitleRow[4] = `Silver Queen Yacht - Sales Ledger for ${filterMonth}`;
    rows.push(ledgerTitleRow);

    const ledgerHeaderRow = Array(38).fill("");
    ledgerHeaderRow[11] = "Row Labels";
    ledgerHeaderRow[12] = "Sum of GrossAmount";
    ledgerHeaderRow[13] = "Sum of TotalAmount";
    rows.push(ledgerHeaderRow);

    const ledgerGroups = {};
    filteredBookings.forEach(b => {
      const ledgerName = b.salesPerson === "Office" ? "Customer (Office) - A/R" : `${b.salesPerson} Sales - A/R`;
      if (!ledgerGroups[ledgerName]) {
        ledgerGroups[ledgerName] = { gross: 0, total: 0 };
      }
      ledgerGroups[ledgerName].gross += Number(b.subtotal);
      ledgerGroups[ledgerName].total += Number(b.totalAmount);
    });

    Object.entries(ledgerGroups).forEach(([label, vals]) => {
      const ledgerRow = Array(38).fill("");
      ledgerRow[11] = label;
      ledgerRow[12] = vals.gross.toFixed(2);
      ledgerRow[13] = vals.total.toFixed(2);
      rows.push(ledgerRow);
    });

    const ledgerTotalRow = Array(38).fill("");
    ledgerTotalRow[11] = "Grand Total";
    ledgerTotalRow[12] = totalGross.toFixed(2);
    ledgerTotalRow[13] = totalAmountSum.toFixed(2);
    rows.push(ledgerTotalRow);

    // Convert to CSV
    const csvContent = "\uFEFF" + rows.map(r => r.map(escapeCsvCell).join(",")).join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SilverQueen_Sales_Report_${filterMonth}.csv`);
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
            AED
          </div>
          <div className="metric-details">
            <span className="metric-label">Total Revenue</span>
            <span className="metric-value">AED {totalRevenue.toLocaleString()}</span>
            <span className="metric-subtext text-success">Active Bookings Booked</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper color-collected">
            ✓
          </div>
          <div className="metric-details">
            <span className="metric-label">Cash Collected</span>
            <span className="metric-value">AED {totalCollected.toLocaleString()}</span>
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
            <span className="metric-value">AED {totalPending.toLocaleString()}</span>
            <span className="metric-subtext text-danger">Uncollected balances</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper color-yachts">
            📈
          </div>
          <div className="metric-details">
            <span className="metric-label">Estimated Profits</span>
            <span className="metric-value">AED {Math.round(estimatedProfit).toLocaleString()}</span>
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
              May: <strong>AED {momStats.prevVal.toLocaleString()}</strong> &rarr; June: <strong>AED {momStats.currentVal.toLocaleString()}</strong>
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
                      <span className="chart-tooltip">AED {trend.total.toLocaleString()}</span>
                    </div>
                    {/* Collected Bar */}
                    <div className="chart-bar" style={{ height: `${colHeightPct}%`, backgroundColor: 'var(--success)', maxWidth: '24px' }}>
                      <span className="chart-tooltip">AED {trend.collected.toLocaleString()}</span>
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
                    <span className="chart-tooltip">AED {rep.total.toLocaleString()}</span>
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
                AED {Math.round(totalYachtRevenue / 1000)}k
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
                      <td>AED {b.subtotal}</td>
                      <td style={{ color: 'var(--text-muted)' }}>AED {b.vatAmount} ({b.vatRate || 0}%)</td>
                      <td><strong>AED {b.totalAmount}</strong></td>
                      <td className="text-success">AED {b.paymentAmount}</td>
                      <td className={due > 0 ? "text-danger" : "text-success"} style={{ fontWeight: 600 }}>
                        {due > 0 ? `AED ${due}` : "Paid"}
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

      {/* Captain Cash Reconciliation Ledger */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Captain On-Board Cash Reconciliation</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>
              Verify and reconcile payments collected on-board by Yacht Captains
            </p>
          </div>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
            Total On-Board Collections: AED {bookings
              .filter(b => b.paymentCollectedBy && b.paymentCollectedBy !== "Sales")
              .reduce((sum, b) => sum + b.paymentAmount, 0)
            }
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Guest</th>
                <th>Yacht</th>
                <th>Trip Date</th>
                <th>Collected By</th>
                <th>Payment Mode</th>
                <th>Amount Collected</th>
                <th>Boarding Status</th>
                <th>Reconciliation Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.filter(b => b.paymentCollectedBy && b.paymentCollectedBy !== "Sales").length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No on-board payments logged by captains yet.
                  </td>
                </tr>
              ) : (
                bookings
                  .filter(b => b.paymentCollectedBy && b.paymentCollectedBy !== "Sales")
                  .map(b => {
                    const y = yachts.find(yacht => yacht.id === b.yachtId);
                    return (
                      <tr key={b.id}>
                        <td><code style={{ fontSize: '0.75rem' }}>#{b.id.toUpperCase()}</code></td>
                        <td><strong>{b.guestName}</strong></td>
                        <td>{y ? y.name : 'Unknown Yacht'}</td>
                        <td>{new Date(b.startDate).toLocaleDateString()}</td>
                        <td>👤 {b.paymentCollectedBy}</td>
                        <td><span className="badge badge-info">{b.paymentMode}</span></td>
                        <td><strong className="text-success">AED {b.paymentAmount}</strong></td>
                        <td>
                          <span className={`badge ${b.boardingStatus === "Boarded" ? "badge-info" : b.boardingStatus === "Completed" ? "badge-success" : "badge-warning"}`}>
                            {b.boardingStatus}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ✔️ Ready to Reconcile
                          </span>
                        </td>
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
