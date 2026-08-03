'use client';

import { useState, useEffect, useRef } from 'react';

const DEFAULT_SUGGESTIONS = [
  'Food & Meals',
  'Petrol / Fuel',
  'Tea & Snacks',
  'Grocery & Supplies',
  'Milk & Dairy',
  'Auto / Cab Fare',
  'Mobile Recharge',
  'Electricity Bill',
  'Wifi / Broadband',
  'Medicine & Pharmacy',
  'Restaurant / Eating Out',
  'Shopping',
  'House Rent',
  'Fruits & Vegetables',
  'Movie & Entertainment'
];

const ITEMS_PER_PAGE = 10;

export default function Home() {
  // Auth state
  const [currentUser, setCurrentUser] = useState('');
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [authTab, setAuthTab] = useState('signin');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  
  const [signupUser, setSignupUser] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [signupErr, setSignupErr] = useState('');

  // App & Theme state
  const [colorTheme, setColorTheme] = useState('indigo');
  const [themeMode, setThemeMode] = useState('light');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Expense state
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // PWA Prompt state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const fileInputRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Load theme preferences
    const savedColor = localStorage.getItem('kharcha_color_theme') || 'indigo';
    const savedMode = localStorage.getItem('expense_theme') || 'light';
    setColorTheme(savedColor);
    setThemeMode(savedMode);
    document.documentElement.setAttribute('data-color-theme', savedColor);
    document.documentElement.setAttribute('data-theme', savedMode);

    // Load saved user session
    const savedUser = localStorage.getItem('kharcha_current_user') || '';
    if (savedUser) {
      setCurrentUser(savedUser);
    }
    setIsAuthLoaded(true);

    // PWA event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Sync Expenses when currentUser changes
  useEffect(() => {
    if (currentUser) {
      fetchExpenses(currentUser);
      setCurrentPage(1);
    }
  }, [currentUser]);

  // Reset page to 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Sync Theme Attributes
  const handleSetColorTheme = (color) => {
    setColorTheme(color);
    localStorage.setItem('kharcha_color_theme', color);
    document.documentElement.setAttribute('data-color-theme', color);
    setIsThemeModalOpen(false);
  };

  const handleToggleThemeMode = () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    localStorage.setItem('expense_theme', nextMode);
    document.documentElement.setAttribute('data-theme', nextMode);
  };

  // --- API CALLS ---
  const fetchExpenses = async (username) => {
    try {
      const res = await fetch(`/api/expenses?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (e) {
      console.error('Failed to fetch expenses:', e);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoginErr('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setCurrentUser(data.user.username);
      localStorage.setItem('kharcha_current_user', data.user.username);
      setLoginUser('');
      setLoginPass('');
    } catch (err) {
      setLoginErr(err.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSignupErr('');
    if (signupUser.trim().length < 3 || signupPass.trim().length < 3) {
      setSignupErr('Username and Password must be at least 3 characters.');
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: signupUser, password: signupPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setCurrentUser(data.user.username);
      localStorage.setItem('kharcha_current_user', data.user.username);
      setSignupUser('');
      setSignupPass('');
      alert(`Account created successfully for ${data.user.username}!`);
    } catch (err) {
      setSignupErr(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kharcha_current_user');
    setCurrentUser('');
    setExpenses([]);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0 || !reason.trim()) {
      alert('Please enter a valid amount and reason.');
      return;
    }
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amtNum, reason: reason.trim(), username: currentUser })
      });
      if (res.ok) {
        setAmount('');
        setReason('');
        setIsAddModalOpen(false);
        fetchExpenses(currentUser);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save expense');
      }
    } catch (err) {
      console.error('Error adding expense:', err);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExpenses(currentUser);
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  // Data Management Options
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert('No expense entries to export.');
      return;
    }
    let csv = 'ID,User,Date,Reason,Amount (INR),CreatedAt\n';
    expenses.forEach(item => {
      csv += `"${item.id}","${item.username}","${item.date}","${item.reason.replace(/"/g, '""')}",${item.amount},"${item.createdAt}"\n`;
    });
    downloadBlob(csv, `Kharcha_Export_${currentUser}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportJSON = () => {
    if (expenses.length === 0) {
      alert('No expense entries to backup.');
      return;
    }
    const jsonStr = JSON.stringify(expenses, null, 2);
    downloadBlob(jsonStr, `Kharcha_Backup_${currentUser}_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          const res = await fetch('/api/expenses/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: importedData, username: currentUser })
          });
          if (res.ok) {
            alert(`Successfully imported ${importedData.length} records!`);
            setIsDataModalOpen(false);
            fetchExpenses(currentUser);
          }
        } else {
          alert('Invalid JSON file format.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = async () => {
    if (confirm(`Are you sure you want to delete all expenses for user "${currentUser}" permanently?`)) {
      try {
        const res = await fetch(`/api/expenses/clear?username=${encodeURIComponent(currentUser)}`, { method: 'DELETE' });
        if (res.ok) {
          setIsDataModalOpen(false);
          fetchExpenses(currentUser);
        }
      } catch (err) {
        console.error('Failed to clear expenses:', err);
      }
    }
  };

  function downloadBlob(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Filter calculations
  const filteredExpenses = expenses.filter(item => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);
    const dayOfWeek = now.getDay() || 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    if (filter === 'today') return item.date === todayStr;
    if (filter === 'weekly') return item.timestamp >= startOfWeek.getTime();
    if (filter === 'monthly') return item.date && item.date.startsWith(currentMonthStr);
    return true;
  });

  const totalAmount = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  // Pagination Logic (10 per page)
  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Suggestions List
  const customReasons = expenses.map(i => i.reason.trim()).filter(Boolean);
  const combinedSuggestions = Array.from(new Set([...DEFAULT_SUGGESTIONS, ...customReasons]));

  if (!isAuthLoaded) return null;

  return (
    <div style={{ width: '100%', minHeight: '100dvh', display: 'flex', justifyContent: 'center', alignItems: currentUser ? 'flex-start' : 'center' }}>
      {/* 1. LOGIN / SIGN UP VIEW */}
      {!currentUser ? (
        <div className="login-container">
          <div className="login-card glass-card">
            <div className="login-top-bar">
              <button 
                className="icon-action-btn" 
                title="Choose Color Theme"
                onClick={() => setIsThemeModalOpen(true)}
              >🎨</button>
            </div>
            
            <div className="login-header">
              <img src="/logo.png" alt="Kharcha Logo" className="login-logo-img" />
              <h2>Kharcha</h2>
            </div>

            {/* Sign In / Sign Up Tabs */}
            <div className="auth-tabs">
              <button 
                className={`auth-tab-btn ${authTab === 'signin' ? 'active' : ''}`}
                onClick={() => setAuthTab('signin')}
              >Sign In</button>
              <button 
                className={`auth-tab-btn ${authTab === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthTab('signup')}
              >Sign Up</button>
            </div>

            {/* Sign In Form */}
            {authTab === 'signin' ? (
              <form onSubmit={handleSignIn} className="auth-form">
                <div className="form-group">
                  <input 
                    type="text" 
                    placeholder="Username" 
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    required 
                  />
                </div>
                {loginErr && <div className="login-error">{loginErr}</div>}
                <button type="submit" className="btn btn-primary btn-block">Sign In</button>
              </form>
            ) : (
              /* Sign Up Form */
              <form onSubmit={handleSignUp} className="auth-form">
                <div className="form-group">
                  <input 
                    type="text" 
                    placeholder="Choose Username" 
                    value={signupUser}
                    onChange={(e) => setSignupUser(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <input 
                    type="password" 
                    placeholder="Choose Password" 
                    value={signupPass}
                    onChange={(e) => setSignupPass(e.target.value)}
                    required 
                  />
                </div>
                {signupErr && <div className="login-error">{signupErr}</div>}
                <button type="submit" className="btn btn-primary btn-block">Create Account</button>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* 2. MAIN DASHBOARD VIEW */
        <div className="dashboard-container">
          {/* Floating Top Navbar with Logged In User Badge */}
          <header className="floating-navbar glass-card">
            <div className="nav-left">
              <img src="/logo.png" alt="Kharcha Logo" className="nav-logo-img" />
              <div className="nav-brand-group">
                <span className="nav-brand">Kharcha</span>
                <span className="user-pill-tag">@{currentUser}</span>
              </div>
            </div>

            <div className="nav-center">
              <div className="nav-total-pill">
                <span className="total-pill-value">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="nav-right">
              <button className="icon-action-btn" title="Choose Color Palette" onClick={() => setIsThemeModalOpen(true)}>🎨</button>

              {deferredPrompt && (
                <button 
                  className="icon-action-btn" 
                  title="Install App"
                  onClick={async () => {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') setDeferredPrompt(null);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
              )}

              <button className="theme-btn" title="Toggle Light/Dark Theme" onClick={handleToggleThemeMode}>
                {themeMode === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                )}
              </button>

              <button className="icon-action-btn logout-color" title="Log Out" onClick={handleLogout}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          </header>

          {/* Date Filter Bar */}
          <nav className="filter-bar glass-card">
            {['all', 'today', 'weekly', 'monthly'].map((f) => (
              <button 
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </nav>

          {/* Expenses Minimal Line-Divided List */}
          <main className="expense-list-container">
            {filteredExpenses.length === 0 ? (
              <div className="empty-state">
                <p>No expenses found for this period.</p>
                <small>Click the <strong>+</strong> button below to add an expense.</small>
              </div>
            ) : (
              <>
                <ul className="expense-list">
                  {paginatedExpenses.map((item) => (
                    <li key={item.id} className="expense-item">
                      <div className="expense-info">
                        <span className="expense-reason">{item.reason}</span>
                        <span className="expense-date">{item.createdAt || item.date}</span>
                      </div>
                      <div className="expense-right">
                        <span className="expense-amount">-₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <button className="delete-btn" title="Delete Expense" onClick={() => handleDeleteExpense(item.id)}>&times;</button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="pagination-bar glass-card">
                    <button 
                      className="pagination-btn" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      ← Prev
                    </button>
                    <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                    <button 
                      className="pagination-btn" 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          {/* Footer */}
          <footer className="app-footer">
            <p>© 2026 Kharcha. All rights reserved.</p>
          </footer>

          {/* FLOATING CHATBOX ADD EXPENSE WIDGET */}
          {isAddModalOpen && (
            <div className="fab-chatbox-card glass-card">
              <div className="modal-header">
                <h2>Add Expense</h2>
                <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>&times;</button>
              </div>
              <form onSubmit={handleAddExpense}>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    placeholder="₹ 0.00" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    autoFocus 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Reason / Item</label>
                  <input 
                    type="text" 
                    list="reason-suggestions" 
                    placeholder="Type e.g., Food, Petrol, Tea..." 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)} 
                    autoComplete="off" 
                    required 
                  />
                  <datalist id="reason-suggestions">
                    {combinedSuggestions.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Expense</button>
                </div>
              </form>
            </div>
          )}

          {/* Floating Action Button (+) */}
          <button 
            className={`fab-btn ${isAddModalOpen ? 'open-rotate' : ''}`} 
            title={isAddModalOpen ? "Close Widget" : "Add Expense"} 
            onClick={() => setIsAddModalOpen(!isAddModalOpen)}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      )}

      {/* MODAL: DATA MANAGEMENT */}
      {isDataModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setIsDataModalOpen(false)}>
          <div className="modal-card glass-card">
            <div className="modal-header">
              <h2>Data Management</h2>
              <button className="close-btn" onClick={() => setIsDataModalOpen(false)}>&times;</button>
            </div>
            <div className="data-actions-list">
              <button className="data-action-btn" onClick={handleExportCSV}>
                <span className="action-icon">📥</span>
                <div className="action-info">
                  <strong>Export CSV</strong>
                  <small>Download expenses as Excel / CSV spreadsheet</small>
                </div>
              </button>
              <button className="data-action-btn" onClick={handleExportJSON}>
                <span className="action-icon">💾</span>
                <div className="action-info">
                  <strong>Backup Data (JSON)</strong>
                  <small>Save full backup file of all records</small>
                </div>
              </button>
              <button className="data-action-btn" onClick={() => fileInputRef.current?.click()}>
                <span className="action-icon">📂</span>
                <div className="action-info">
                  <strong>Restore / Import Backup</strong>
                  <small>Upload JSON backup file to restore records</small>
                </div>
              </button>
              <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={handleImportJSON} />
              <button className="data-action-btn danger-action" onClick={handleClearAll}>
                <span className="action-icon">🗑️</span>
                <div className="action-info">
                  <strong>Clear All Data</strong>
                  <small>Delete all expense entries permanently</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: 12 COLOR THEME PICKER */}
      {isThemeModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setIsThemeModalOpen(false)}>
          <div className="modal-card glass-card theme-picker-card">
            <div className="modal-header">
              <h2>Select Theme Color</h2>
              <button className="close-btn" onClick={() => setIsThemeModalOpen(false)}>&times;</button>
            </div>
            <div className="theme-grid">
              {[
                { id: 'indigo', name: '1. Indigo Electric', bg: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
                { id: 'emerald', name: '2. Emerald Mint', bg: 'linear-gradient(135deg, #10b981, #059669)' },
                { id: 'cyan', name: '3. Cyber Cyan', bg: 'linear-gradient(135deg, #06b6d4, #0284c7)' },
                { id: 'purple', name: '4. Royal Violet', bg: 'linear-gradient(135deg, #a855f7, #7e22ce)' },
                { id: 'amber', name: '5. Sunset Amber', bg: 'linear-gradient(135deg, #f59e0b, #ea580c)' },
                { id: 'rose', name: '6. Crimson Rose', bg: 'linear-gradient(135deg, #f43f5e, #e11d48)' },
                { id: 'monochrome', name: '7. Monochrome', bg: 'linear-gradient(135deg, #3f3f46, #09090b)' },
                { id: 'teal', name: '8. Ocean Teal', bg: 'linear-gradient(135deg, #14b8a6, #0d9488)' },
                { id: 'nordic', name: '9. Nordic Aurora', bg: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' },
                { id: 'gold', name: '10. VIP Gold', bg: 'linear-gradient(135deg, #eab308, #ca8a04)' },
                { id: 'neon', name: '11. Cyber Neon', bg: 'linear-gradient(135deg, #ec4899, #8b5cf6)' },
                { id: 'coral', name: '12. Soft Coral', bg: 'linear-gradient(135deg, #ff7e5f, #feb47b)' },
              ].map((t) => (
                <button 
                  key={t.id} 
                  className={`theme-option-btn ${colorTheme === t.id ? 'active' : ''}`}
                  onClick={() => handleSetColorTheme(t.id)}
                >
                  <span className="swatch" style={{ background: t.bg }}></span>
                  <span className="theme-name">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
