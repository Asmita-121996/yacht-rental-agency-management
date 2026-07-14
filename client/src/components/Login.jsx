import React, { useState } from 'react';

export default function Login({ users, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      // Execute authentication check against the Express backend
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Incorrect email or password.");
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
            <label>Email Address *</label>
            <input
              type="email"
              placeholder="e.g. admin@yachtflow.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

      </div>
    </div>
  );
}
