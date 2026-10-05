import { useState, useEffect } from 'react'
import './App.css'

export default function App() {
  const [health, setHealth] = useState(null)
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    currency: 'USD',
    status: 'Active'
  })

  const API_BASE = '/api/v1'

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch Health
      const healthRes = await fetch(`${API_BASE}/health`)
      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setHealth(healthData)
      } else {
        setHealth(null)
      }

      // Fetch Companies
      const compRes = await fetch(`${API_BASE}/companies`)
      if (compRes.ok) {
        const compData = await compRes.json()
        setCompanies(compData)
      }
    } catch (err) {
      console.error('Backend connection error:', err)
      setError('Could not connect to FastAPI server. Please ensure the backend is running.')
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateCompany = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        const newComp = await res.json()
        setCompanies(prev => [...prev, newComp])
        setIsModalOpen(false)
        setFormData({ name: '', code: '', currency: 'USD', status: 'Active' })
      } else {
        alert('Failed to create company')
      }
    } catch (err) {
      alert('Error creating company: ' + err.message)
    }
  }

  // Calculate Metrics
  const totalRevenue = companies.reduce((acc, c) => acc + (c.total_revenue || 0), 0)
  const totalExpenses = companies.reduce((acc, c) => acc + (c.total_expenses || 0), 0)
  const totalNetProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : 0

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">MCT</div>
          <div className="brand-info">
            <h1>Centralized Financial Management</h1>
            <p>MCT Companies Group Multi-Entity Financial Overview</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="status-pill">
            <span className={`status-dot ${health ? 'status-online' : 'status-offline'}`}></span>
            <span>{health ? 'FastAPI Online' : 'FastAPI Offline'}</span>
          </div>
          <a 
            href="http://127.0.0.1:8000/docs" 
            target="_blank" 
            rel="noreferrer" 
            className="api-link-btn"
          >
            <span>Swagger API Docs</span>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </header>

      {/* Error / Offline Alert */}
      {error && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          color: '#f87171',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>Backend Connection Notice:</strong> {error}
          </div>
          <button 
            onClick={fetchData}
            style={{
              background: '#ef4444',
              color: 'white',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.8rem'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <section className="metrics-grid">
        <div className="metric-card">
          <span className="metric-title">Registered Companies</span>
          <span className="metric-value">{companies.length}</span>
          <span className="metric-sub">Active corporate entities</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Group Revenue</span>
          <span className="metric-value" style={{ color: '#60a5fa' }}>
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="metric-sub">Aggregated gross income</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Group Expenses</span>
          <span className="metric-value" style={{ color: '#f87171' }}>
            ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="metric-sub">Operational & capital expenditures</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Net Operating Profit</span>
          <span className="metric-value" style={{ color: '#34d399' }}>
            ${totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="metric-sub">{profitMargin}% average profit margin</span>
        </div>
      </section>

      {/* Companies Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Entities & Subsidiaries</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Financial position by individual MCT company</p>
          </div>

          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Company
          </button>
        </div>

        <div className="table-card">
          <table className="companies-table">
            <thead>
              <tr>
                <th>Entity Code & Name</th>
                <th>Currency</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Net Profit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading financial data...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No companies found. Click "Add Company" to register your first entity.
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="company-code">{c.code}</span>
                      <strong>{c.name}</strong>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.currency}</td>
                    <td>${(c.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ color: '#f87171' }}>${(c.total_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="text-profit">
                      ${(c.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="badge badge-active">{c.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal for Adding Company */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add New MCT Entity</h3>
            <form onSubmit={handleCreateCompany}>
              <div className="form-group">
                <label>Company Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. MCT Construction & Infrastructure" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Company Code</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. MCT-CONST" 
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="form-group">
                <label>Default Currency</label>
                <select 
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                  <option value="MYR">MYR - Malaysian Ringgit</option>
                  <option value="PHP">PHP - Philippine Peso</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
