import React, { useState, useEffect } from 'react';
import DashboardSales from './components/DashboardSales';
import DashboardAccounts from './components/DashboardAccounts';
import DashboardAdmin from './components/DashboardAdmin';
import DashboardCaptain from './components/DashboardCaptain';
import AgentAvailability from './components/AgentAvailability';
import Login from './components/Login';

export default function App() {
  // Authentication & Users State
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [activeTab, setActiveTab] = useState("sales");
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("yachtflow_theme") || "dark";
  });

  // Backend Synchronized States
  const [yachts, setYachts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [systemDefaults, setSystemDefaults] = useState({ cateringPricePerGuest: 50 });
  const [loading, setLoading] = useState(true);

  // Fetch initial data from Express backend
  const loadBackendData = async () => {
    try {
      const [usersRes, yachtsRes, bookingsRes, defaultsRes] = await Promise.all([
        fetch('/api/users').then(r => { 
          if (r.status === 401) throw new Error("Unauthorized"); 
          if (!r.ok) return []; 
          return r.json(); 
        }),
        fetch('/api/yachts').then(r => { 
          if (r.status === 401) throw new Error("Unauthorized"); 
          if (!r.ok) return []; 
          return r.json(); 
        }),
        fetch('/api/bookings').then(r => { 
          if (r.status === 401) throw new Error("Unauthorized"); 
          if (!r.ok) return []; 
          return r.json(); 
        }),
        fetch('/api/settings').then(r => { 
          if (r.status === 401) throw new Error("Unauthorized"); 
          if (!r.ok) return { cateringPricePerGuest: 50 }; 
          return r.json(); 
        })
      ]);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setYachts(Array.isArray(yachtsRes) ? yachtsRes : []);
      setBookings(Array.isArray(bookingsRes) ? bookingsRes : []);
      setSystemDefaults(defaultsRes && typeof defaultsRes === 'object' ? defaultsRes : { cateringPricePerGuest: 50 });
    } catch (err) {
      console.error("Failed to load YachtFlow backend configurations:", err);
      if (err.message === "Unauthorized") {
        setCurrentUser(null);
      }
    }
  };

  // Check auth session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (res.ok && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Failed to check auth session status:", err);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // Fetch backend data whenever user is logged in
  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      loadBackendData().finally(() => setLoading(false));
    } else {
      setUsers([]);
      setYachts([]);
      setBookings([]);
    }
  }, [currentUser]);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("yachtflow_theme", themeMode);
  }, [themeMode]);

  // Set default workspace view tab on login
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "sales") {
        setActiveTab("sales");
      } else if (currentUser.role === "accounts") {
        setActiveTab("accounts");
      } else if (currentUser.role === "admin") {
        setActiveTab("admin");
      } else if (currentUser.role === "captain") {
        setActiveTab("captain");
      } else if (currentUser.role === "agent") {
        setActiveTab("agent");
      }
    }
  }, [currentUser]);

  const toggleTheme = () => {
    setThemeMode(prev => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error("Failed during server logout:", err);
    } finally {
      setCurrentUser(null);
      setLoading(false);
    }
  };

  // User accounts CRUD handlers using Backend API
  const handleAddUser = async (userData) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user account.");
      }
      // Reload users from backend
      const updatedUsers = await fetch('/api/users').then(r => r.json());
      setUsers(updatedUsers);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleUserActive = async (userId) => {
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT'
      });
      if (!res.ok) throw new Error("Failed to toggle user status.");
      
      const updatedUsers = await fetch('/api/users').then(r => r.json());
      setUsers(updatedUsers);
      
      // If the current logged-in user deactivates their own account, log out
      if (currentUser && currentUser.id === userId) {
        const userObj = updatedUsers.find(u => u.id === userId);
        if (userObj && !userObj.active) {
          setCurrentUser(null);
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (currentUser && currentUser.id === userId) {
      alert("You cannot delete your own logged-in account.");
      return;
    }
    if (window.confirm("Are you sure you want to permanently remove this user account?")) {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error("Failed to delete user account.");
        setUsers(prev => prev.filter(u => u.id !== userId));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleUpdateUserPassword = async (userId, newPassword) => {
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      if (!res.ok) throw new Error("Failed to update password.");
      
      const updatedUsers = await fetch('/api/users').then(r => r.json());
      setUsers(updatedUsers);
    } catch (err) {
      alert(err.message);
    }
  };

  // State Modification Handlers for Yacht bookings using Backend API
  const handleAddBooking = async (bookingData) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to create booking." };
      }
      
      // Refresh bookings log
      const updatedBookings = await fetch('/api/bookings').then(r => r.json());
      setBookings(updatedBookings);
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const handleUpdateBooking = async (updatedBooking) => {
    try {
      const res = await fetch(`/api/bookings/${updatedBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBooking)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to update booking." };
      }
      
      // Refresh bookings log
      const updatedBookings = await fetch('/api/bookings').then(r => r.json());
      setBookings(updatedBookings);
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const handleCheckinBooking = async (bookingId, checkinData) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/checkin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkinData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to confirm boarding." };
      }
      // Refresh bookings log
      const updatedBookings = await fetch('/api/bookings').then(r => r.json());
      setBookings(updatedBookings);
      return { success: true };
    } catch (err) {
      console.error("Checkin error:", err);
      return { success: false, error: err.message };
    }
  };

  const handleAddYacht = async (yachtData) => {
    try {
      const res = await fetch('/api/yachts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yachtData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register new yacht.");

      const updatedYachts = await fetch('/api/yachts').then(r => r.json());
      setYachts(updatedYachts);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateYacht = async (updatedYacht) => {
    try {
      const res = await fetch(`/api/yachts/${updatedYacht.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedYacht)
      });
      if (!res.ok) throw new Error("Failed to update yacht profile.");

      const updatedYachts = await fetch('/api/yachts').then(r => r.json());
      setYachts(updatedYachts);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteYacht = async (yachtId) => {
    if (window.confirm("Are you sure you want to remove this yacht from the registry?")) {
      try {
        const res = await fetch(`/api/yachts/${yachtId}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error("Failed to delete yacht registry.");
        setYachts(prev => prev.filter(y => y.id !== yachtId));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleUpdateSystemDefaults = async (newDefaults) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDefaults)
      });
      if (!res.ok) throw new Error("Failed to save defaults settings.");
      setSystemDefaults(newDefaults);
    } catch (err) {
      alert(err.message);
    }
  };

  // Render full page loader
  if (loading) {
    return (
      <div className="flex flex-col align-center justify-center" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="login-logo-icon" style={{ animation: 'pulse 1.5s infinite ease-in-out', marginBottom: '16px' }}>YF</div>
          <h3>Connecting to YachtFlow Database...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>Verifying PostgreSQL connection</p>
        </div>
      </div>
    );
  }

  // If not logged in, render Login page
  if (!currentUser) {
    return (
      <div className="flex flex-col" style={{ minHeight: '100vh' }}>
        <header className="app-header">
          <div className="logo-container">
            <div className="logo-icon">YF</div>
            <h1 className="app-title">YachtFlow</h1>
          </div>
          <button className="btn btn-secondary" onClick={toggleTheme}>
            {themeMode === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </header>
        <main className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Login users={users} onLogin={handleLogin} />
        </main>
        <footer style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          YachtFlow Booking & Revenue Management System &copy; 2026.
        </footer>
      </div>
    );
  }

  // Get active sales persons based on user list
  const activeSalesReps = users.filter(u => u.role === "sales" && u.active);

  // ── Agent: render isolated mobile availability view ──
  if (currentUser.role === "agent") {
    return (
      <AgentAvailability
        yachts={yachts}
        bookings={bookings}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh' }}>
      
      {/* Top Banner showing Authenticated User Details */}
      <div className="persona-bar">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span>User Type: <strong style={{ color: 'var(--brand)' }}>{currentUser.type}</strong></span>
          <span style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>Designation: <strong style={{ color: 'var(--info)' }}>{currentUser.designation}</strong></span>
          <span style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>Logged in as: <strong>{currentUser.name}</strong></span>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
          Sign Out
        </button>
      </div>

      {/* Main Header navigation */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">YF</div>
          <h1 className="app-title">YachtFlow</h1>
        </div>

        <nav className="nav-links">
          {/* Sales tab visible for Sales, Accounts, Admin, and Captain */}
          {(currentUser.role === "sales" || currentUser.role === "admin" || currentUser.role === "accounts" || currentUser.role === "captain") && (
            <button
              className={`nav-link ${activeTab === "sales" ? "active" : ""}`}
              onClick={() => setActiveTab("sales")}
            >
              🗓️ Booking Calendar
            </button>
          )}

          {/* Captain tab visible for Captain and Admin */}
          {(currentUser.role === "captain" || currentUser.role === "admin") && (
            <button
              className={`nav-link ${activeTab === "captain" ? "active" : ""}`}
              onClick={() => setActiveTab("captain")}
            >
              ⚓ Boarding Log
            </button>
          )}

          {/* Accounts tab visible for Accounts and Admin */}
          {(currentUser.role === "accounts" || currentUser.role === "admin") && (
            <button
              className={`nav-link ${activeTab === "accounts" ? "active" : ""}`}
              onClick={() => setActiveTab("accounts")}
            >
              📊 Finance Ledger
            </button>
          )}

          {/* Admin tab visible only for Admin */}
          {currentUser.role === "admin" && (
            <button
              className={`nav-link ${activeTab === "admin" ? "active" : ""}`}
              onClick={() => setActiveTab("admin")}
            >
              ⚙️ System Admin
            </button>
          )}
        </nav>

        <div className="flex align-center gap-16">
          <button
            className="btn btn-secondary"
            onClick={toggleTheme}
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          >
            {themeMode === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </header>

      {/* App Workspace Area */}
      <main className="app-container">
        {activeTab === "sales" && (
          <DashboardSales
            bookings={bookings}
            yachts={yachts}
            salesPersons={activeSalesReps}
            currentPersona={currentUser}
            onAddBooking={handleAddBooking}
            onUpdateBooking={handleUpdateBooking}
            systemDefaults={systemDefaults}
          />
        )}

        {activeTab === "accounts" && (
          <DashboardAccounts
            bookings={bookings}
            yachts={yachts}
            salesPersons={activeSalesReps}
          />
        )}

        {activeTab === "admin" && (
          <DashboardAdmin
            yachts={yachts}
            salesPersons={activeSalesReps}
            systemDefaults={systemDefaults}
            onAddYacht={handleAddYacht}
            onUpdateYacht={handleUpdateYacht}
            onDeleteYacht={handleDeleteYacht}
            users={users}
            onAddUser={handleAddUser}
            onToggleUserActive={handleToggleUserActive}
            onDeleteUser={handleDeleteUser}
            onUpdateUserPassword={handleUpdateUserPassword}
            onUpdateSystemDefaults={handleUpdateSystemDefaults}
          />
        )}

        {activeTab === "captain" && (
          <DashboardCaptain
            bookings={bookings}
            yachts={yachts}
            currentPersona={currentUser}
            onCheckinBooking={handleCheckinBooking}
            systemDefaults={systemDefaults}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '20px 24px',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        YachtFlow Booking & Revenue Management System &copy; 2026.
      </footer>
    </div>
  );
}
