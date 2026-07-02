import React, { useState } from 'react';

export default function DashboardAdmin({
  yachts,
  salesPersons,
  systemDefaults,
  onAddYacht,
  onUpdateYacht,
  onDeleteYacht,
  users,
  onAddUser,
  onToggleUserActive,
  onDeleteUser,
  onUpdateUserPassword,
  onUpdateSystemDefaults
}) {
  // Yacht form states
  const [showYachtModal, setShowYachtModal] = useState(false);
  const [editingYacht, setEditingYacht] = useState(null);
  const [yachtName, setYachtName] = useState("");
  const [yachtCapacity, setYachtCapacity] = useState(10);
  const [yachtHourlyRate, setYachtHourlyRate] = useState(200);
  const [yachtDescription, setYachtDescription] = useState("");

  // User creation state variables
  const [newUserName, setNewUserName] = useState("");
  const [newUserType, setNewUserType] = useState("Regular User");
  const [newUserDesignation, setNewUserDesignation] = useState("Sales");
  const [newUserPassword, setNewUserPassword] = useState("");

  // System defaults state
  const [cateringPrice, setCateringPrice] = useState(systemDefaults.cateringPricePerGuest);
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  // Open Add/Edit Yacht modal
  const handleOpenYachtModal = (yacht = null) => {
    if (yacht) {
      setEditingYacht(yacht);
      setYachtName(yacht.name);
      setYachtCapacity(yacht.capacity);
      setYachtHourlyRate(yacht.hourlyRate);
      setYachtDescription(yacht.description);
    } else {
      setEditingYacht(null);
      setYachtName("");
      setYachtCapacity(10);
      setYachtHourlyRate(200);
      setYachtDescription("");
    }
    setShowYachtModal(true);
  };

  // Submit Yacht
  const handleYachtSubmit = (e) => {
    e.preventDefault();
    if (!yachtName.trim()) return;

    const yachtData = {
      name: yachtName,
      capacity: Number(yachtCapacity),
      hourlyRate: Number(yachtHourlyRate),
      description: yachtDescription
    };

    if (editingYacht) {
      onUpdateYacht({ ...yachtData, id: editingYacht.id });
    } else {
      onAddYacht(yachtData);
    }
    setShowYachtModal(false);
  };

  // Submit User creation
  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPassword.trim()) return;

    let role = "sales";
    if (newUserDesignation === "Accounts") role = "accounts";
    if (newUserDesignation === "Admin") role = "admin";

    onAddUser({
      name: newUserName,
      type: newUserType,
      designation: newUserDesignation,
      role,
      password: newUserPassword
    });

    setNewUserName("");
    setNewUserPassword("");
  };

  // Submit System Settings
  const handleSaveDefaults = (e) => {
    e.preventDefault();
    onUpdateSystemDefaults({
      cateringPricePerGuest: Number(cateringPrice)
    });
    setDefaultsSaved(true);
    setTimeout(() => setDefaultsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-24">
      {/* Dynamic Grid */}
      <div className="grid-2">
        
        {/* Yacht Registry card */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div>
              <h3>Yacht Registry Fleet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>Configure hourly charter rates, visual names, and capacity limits</p>
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenYachtModal(null)}>
              + Add New Yacht
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Yacht Name</th>
                  <th>Capacity Limit</th>
                  <th>Hourly Base Rate</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {yachts.map(y => (
                  <tr key={y.id}>
                    <td><strong>{y.name}</strong></td>
                    <td>{y.capacity} guests max</td>
                    <td><strong className="text-success">${y.hourlyRate}/hr</strong></td>
                    <td>{y.description}</td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleOpenYachtModal(y)}>
                          Configure
                        </button>
                        <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => onDeleteYacht(y.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Management and Accounts Registry card */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div>
              <h3>User Accounts & Access Management</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>Create, suspend, or delete access credentials for Sales executives and Accountants</p>
            </div>
          </div>
          
          <form onSubmit={handleUserSubmit} className="flex gap-16 mb-24 align-center" style={{ flexWrap: 'wrap', backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px' }}>
            <div className="form-group" style={{ flex: 2, minWidth: '200px' }}>
              <label>Account Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Wade Wilson..."
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: '130px' }}>
              <label>Designation</label>
              <select value={newUserDesignation} onChange={(e) => {
                const val = e.target.value;
                setNewUserDesignation(val);
                if (val === "Admin") {
                  setNewUserType("Admin");
                } else {
                  setNewUserType("Regular User");
                }
              }}>
                <option value="Sales">Sales</option>
                <option value="Accounts">Accounts</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            
            <div className="form-group" style={{ flex: 1, minWidth: '130px' }}>
              <label>User Type</label>
              <select value={newUserType} onChange={(e) => setNewUserType(e.target.value)}>
                <option value="Regular User">Regular User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
              <label>Password / PIN *</label>
              <input
                type="text"
                placeholder="Set password..."
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '22px' }}>
              Create Account
            </button>
          </form>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User Full Name</th>
                  <th>Designation</th>
                  <th>User Login Type</th>
                  <th>Password / PIN</th>
                  <th>Active Status</th>
                  <th>Action Control</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>
                      <span className={`badge ${u.designation === 'Admin' ? 'badge-danger' : u.designation === 'Sales' ? 'badge-info' : 'badge-success'}`}>
                        {u.designation}
                      </span>
                    </td>
                    <td>{u.type}</td>
                    <td>
                      <input
                        type="text"
                        value={u.password || ""}
                        onChange={(e) => onUpdateUserPassword(u.id, e.target.value)}
                        required
                        style={{
                          padding: '6px 10px',
                          fontSize: '0.85rem',
                          width: '130px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </td>
                    <td>
                      <span className={`badge ${u.active ? 'badge-success' : 'badge-warning'}`}>
                        {u.active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          onClick={() => onToggleUserActive(u.id)}
                        >
                          {u.active ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          onClick={() => onDeleteUser(u.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Pricing Configurations */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3>Global Pricing & Taxes</h3>
          </div>
          <form onSubmit={handleSaveDefaults} className="flex flex-col gap-16">
            <div className="form-group">
              <label>Standard Tax Model</label>
              <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                <strong>Manual VAT System Active:</strong> Sales executives manually apply <strong>VAT 5%</strong> or <strong>VAT 7%</strong> per booking. Unselected bookings have 0% VAT.
              </div>
            </div>
            
            <div className="form-group">
              <label>Catering Service Fee per Guest ($)</label>
              <input
                type="number"
                min="0"
                value={cateringPrice}
                onChange={(e) => setCateringPrice(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary">Save Global System Config</button>
            
            {defaultsSaved && (
              <div className="badge badge-success" style={{ padding: '10px', borderRadius: '6px', textAlign: 'center', display: 'block', fontWeight: 500 }}>
                ✓ System configurations updated successfully!
              </div>
            )}
          </form>
        </div>
      </div>

      {/* YACHT EDIT MODAL FORM */}
      {showYachtModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingYacht ? "Modify Yacht Profile" : "Register New Yacht"}</h3>
              <button className="close-btn" onClick={() => setShowYachtModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleYachtSubmit}>
              <div className="modal-body flex flex-col gap-16">
                <div className="form-group">
                  <label>Yacht Name *</label>
                  <input
                    type="text"
                    value={yachtName}
                    onChange={(e) => setYachtName(e.target.value)}
                    required
                    placeholder="e.g. Majestic Voyager"
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Passenger Capacity *</label>
                    <input
                      type="number"
                      min="1"
                      value={yachtCapacity}
                      onChange={(e) => setYachtCapacity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Hourly Base Charter Rate ($) *</label>
                    <input
                      type="number"
                      min="1"
                      value={yachtHourlyRate}
                      onChange={(e) => setYachtHourlyRate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Yacht Description / Features</label>
                  <textarea
                    rows="3"
                    value={yachtDescription}
                    onChange={(e) => setYachtDescription(e.target.value)}
                    placeholder="e.g. Built in 2022, luxury suite, wet bar, jacuzzi..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowYachtModal(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingYacht ? "Update Yacht" : "Add Yacht"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
