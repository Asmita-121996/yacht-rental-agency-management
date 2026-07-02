import React, { useState } from 'react';

export default function Login({ users, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      // Execute authentication check against the Express backend
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Incorrect name or password.");
      }

      // Successful authentication, trigger callback
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card card">
        <div className="login-header">
          <div className="login-logo-icon">YF</div>
          <h2>YachtFlow</h2>
          <p className="login-tagline">Charter Bookings & Revenue Management</p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ display: 'block', padding: '8px 12px', borderRadius: '4px', textAlign: 'center', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-16">
          <div className="form-group">
            <label>Name / Username *</label>
            <input
              type="text"
              placeholder="e.g. SQ ADMIN"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ padding: '10px', fontSize: '0.95rem' }}
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '10px', fontSize: '0.95rem' }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '12px', fontSize: '1rem', marginTop: '8px' }}
          >
            Sign In to Dashboard
          </button>
        </form>

        <div style={{ marginTop: '24px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>💡 Quick-start Credentials (Type exactly):</div>
          <ul style={{ paddingLeft: '16px', margin: 0 }}>
            <li><strong>Admin</strong>: <code>SQ ADMIN</code> (password: <code>admin123</code>)</li>
            <li><strong>Sales</strong>: <code>Pradeesh Ezhava</code> or <code>Chetan</code> (password: <code>sales123</code>)</li>
            <li><strong>Accounts</strong>: <code>SQ Accounts</code> (password: <code>accounts123</code>)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
