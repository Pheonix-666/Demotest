'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check existing session
    fetch('/api/admin/check')
      .then(r => r.json())
      .then(d => { if (d.ok) setAuthed(true); })
      .finally(() => setChecking(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) { setAuthed(true); setPassword(''); }
    else setError(data.error || 'Invalid password.');
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(91,110,245,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <nav className="nav" style={{ position: 'relative', zIndex: 10 }}>
          <span className="nav-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            ExamPortal Admin
          </span>
          <div className="nav-links">
            <button className="nav-link" onClick={() => router.push('/')}>Student Portal</button>
          </div>
        </nav>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '100%', maxWidth: 400 }} className="animate-fadeInUp">
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'linear-gradient(135deg, #7c3aed, #5b6ef5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(124,58,237,0.4)'
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h1 className="page-title">Admin Login</h1>
              <p className="page-sub" style={{ marginTop: 8 }}>Enter your admin password to continue</p>
            </div>
            <div className="card">
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="form-group">
                  <label className="label">Admin Password</label>
                  <input className="input" type="password" placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} id="admin-password" autoFocus />
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} id="btn-admin-login">
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Verifying…</> : 'Login to Admin Panel →'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>Default password: <code style={{ color: 'var(--accent)', background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4 }}>admin123</code></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'upload' | 'exams' | 'submissions'>('dashboard');
  const [exams, setExams] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  async function loadData() {
    setStatsLoading(true);
    try {
      const [eRes, sRes] = await Promise.all([fetch('/api/exams'), fetch('/api/submissions')]);
      const eData = await eRes.json();
      const sData = await sRes.json();
      setExams(eData.exams || []);
      setSubmissions(sData.submissions || []);
    } catch {}
    setStatsLoading(false);
  }

  useEffect(() => { loadData(); }, [tab]);

  async function toggleExam(id: string, isActive: boolean) {
    await fetch(`/api/exams/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !isActive }) });
    loadData();
  }

  async function deleteExam(id: string) {
    if (!confirm('Delete this exam? This cannot be undone.')) return;
    await fetch(`/api/exams/${id}`, { method: 'DELETE' });
    loadData();
  }

  async function deleteSubmission(id: string) {
    if (!confirm('Delete this submission?')) return;
    await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
    loadData();
  }

  const activeExams = exams.filter(e => e.isActive).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="nav">
        <span className="nav-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          ExamPortal Admin
        </span>
        <div className="nav-links">
          {(['dashboard', 'upload', 'exams', 'submissions'] as const).map(t => (
            <button key={t} className={`nav-link${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'dashboard' ? '📊 Dashboard' : t === 'upload' ? '⬆️ Upload Exam' : t === 'exams' ? '📋 Manage Exams' : '📥 Submissions'}
            </button>
          ))}
          <button className="nav-link" onClick={() => router.push('/')}>Student View</button>
          <button className="nav-link" onClick={onLogout} style={{ color: 'var(--danger)' }}>Logout</button>
        </div>
      </nav>

      <main style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div className="animate-fadeInUp">
            <div style={{ marginBottom: 28 }}>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-sub">Overview of your exam portal activity</p>
            </div>
            {statsLoading ? (
              <div style={{ display: 'flex', gap: 16 }}>
                {[1,2,3,4].map(i => <div key={i} className="stat-card" style={{ flex: 1, minWidth: 180 }}><div style={{ height: 60, background: 'var(--surface2)', borderRadius: 8 }} /></div>)}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
                <div className="stat-card" style={{ borderTop: '3px solid var(--accent)' }}>
                  <div className="stat-label">Total Exams</div>
                  <div className="stat-value">{exams.length}</div>
                  <div className="stat-sub">{activeExams} active</div>
                </div>
                <div className="stat-card" style={{ borderTop: '3px solid var(--accent2)' }}>
                  <div className="stat-label">Active Exams</div>
                  <div className="stat-value" style={{ color: 'var(--accent2)' }}>{activeExams}</div>
                  <div className="stat-sub">Available to students</div>
                </div>
                <div className="stat-card" style={{ borderTop: '3px solid var(--warning)' }}>
                  <div className="stat-label">Submissions</div>
                  <div className="stat-value" style={{ color: 'var(--warning)' }}>{submissions.length}</div>
                  <div className="stat-sub">Total received</div>
                </div>
                <div className="stat-card" style={{ borderTop: '3px solid var(--info)' }}>
                  <div className="stat-label">Unique Students</div>
                  <div className="stat-value" style={{ color: 'var(--info)' }}>{new Set(submissions.map((s: any) => s.studentId)).size}</div>
                  <div className="stat-sub">Submitted so far</div>
                </div>
              </div>
            )}
            {/* Quick Actions */}
            <div className="card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setTab('upload')} id="btn-quick-upload">⬆️ Upload New Exam</button>
                <button className="btn btn-ghost" onClick={() => setTab('submissions')} id="btn-quick-subs">📥 View Submissions</button>
                <button className="btn btn-ghost" onClick={() => setTab('exams')}>📋 Manage Exams</button>
              </div>
            </div>
            {/* Recent Submissions */}
            {submissions.length > 0 && (
              <div className="card">
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Submissions</h2>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Student</th><th>Exam</th><th>Submitted</th><th>Size</th></tr></thead>
                    <tbody>
                      {submissions.slice(-5).reverse().map((s: any) => (
                        <tr key={s.id}>
                          <td><strong>{s.studentName}</strong><br/><span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.studentId}</span></td>
                          <td>{s.examTitle}</td>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(s.submittedAt).toLocaleString()}</td>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>{(s.fileSize / 1024).toFixed(0)} KB</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload tab */}
        {tab === 'upload' && <UploadTab onUploaded={() => { loadData(); setTab('exams'); }} />}

        {/* Exams tab */}
        {tab === 'exams' && (
          <div className="animate-fadeInUp">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 className="page-title">Manage Exams</h1>
                <p className="page-sub">{exams.length} total · {activeExams} active</p>
              </div>
              <button className="btn btn-primary" onClick={() => setTab('upload')} id="btn-add-exam">+ Upload New Exam</button>
            </div>
            {exams.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No Exams Yet</div><div className="empty-sub">Upload your first exam PDF to get started.</div></div></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Title</th><th>File</th><th>Uploaded</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {exams.map((ex: any) => (
                      <tr key={ex.id}>
                        <td>
                          <strong>{ex.title}</strong>
                          {ex.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{ex.description}</div>}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{ex.fileName}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(ex.uploadedAt).toLocaleDateString()}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{ex.deadline ? new Date(ex.deadline).toLocaleString() : '—'}</td>
                        <td>
                          <span className={`badge ${ex.isActive ? 'badge-success' : 'badge-muted'}`}>{ex.isActive ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className={`btn btn-sm ${ex.isActive ? 'btn-ghost' : 'btn-success'}`} onClick={() => toggleExam(ex.id, ex.isActive)}>
                              {ex.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <a href={`/api/exams/${ex.id}/file`} download={ex.fileName} className="btn btn-ghost btn-sm">Download</a>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteExam(ex.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Submissions tab */}
        {tab === 'submissions' && (
          <div className="animate-fadeInUp">
            <div style={{ marginBottom: 24 }}>
              <h1 className="page-title">Submissions</h1>
              <p className="page-sub">{submissions.length} total submissions received</p>
            </div>
            {submissions.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="empty-icon">📥</div><div className="empty-title">No Submissions Yet</div><div className="empty-sub">Submissions will appear here once students submit their exams.</div></div></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Student ID</th><th>Exam</th><th>Submitted</th><th>Size</th><th>Actions</th></tr></thead>
                  <tbody>
                    {[...submissions].reverse().map((s: any) => (
                      <tr key={s.id}>
                        <td><strong>{s.studentName}</strong></td>
                        <td style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>{s.studentId}</td>
                        <td>{s.examTitle}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(s.submittedAt).toLocaleString()}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{(s.fileSize / 1024).toFixed(0)} KB</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <a href={`/api/submissions/${s.id}/file`} download={s.fileName} className="btn btn-ghost btn-sm" id={`download-sub-${s.id}`}>⬇ Download PDF</a>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteSubmission(s.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function UploadTab({ onUploaded }: { onUploaded: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select a PDF file.'); return; }
    if (!title.trim()) { setError('Please enter an exam title.'); return; }
    setUploading(true); setError(''); setProgress(10);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    if (deadline) formData.append('deadline', deadline);
    try {
      setProgress(40);
      const res = await fetch('/api/exams/upload', { method: 'POST', body: formData });
      setProgress(90);
      const data = await res.json();
      setProgress(100);
      if (data.success) {
        setSuccess(`Exam "${title}" uploaded successfully!`);
        setTimeout(() => onUploaded(), 1200);
      } else {
        setError(data.error || 'Upload failed.');
      }
    } catch {
      setError('Upload failed. Please try again.');
    }
    setUploading(false);
  }

  return (
    <div className="animate-fadeInUp" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Upload Exam PDF</h1>
        <p className="page-sub">Upload a PDF exam to make it available to students</p>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="label">Exam Title *</label>
            <input className="input" type="text" placeholder="e.g. Mathematics Final Exam 2024" value={title} onChange={e => setTitle(e.target.value)} id="exam-title" />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="textarea" placeholder="Optional: add instructions or notes for students…" value={description} onChange={e => setDescription(e.target.value)} id="exam-desc" />
          </div>
          <div className="form-group">
            <label className="label">Deadline (optional)</label>
            <input className="input" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} id="exam-deadline" />
          </div>
          <div className="form-group">
            <label className="label">PDF File *</label>
            <div
              className={`upload-zone${drag ? ' drag-over' : ''}`}
              onClick={() => document.getElementById('pdf-file-input')?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => {
                e.preventDefault(); setDrag(false);
                const f = e.dataTransfer.files[0];
                if (f?.type === 'application/pdf') setFile(f);
                else setError('Please drop a valid PDF file.');
              }}
              id="pdf-drop-zone"
            >
              <input id="pdf-file-input" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ''; }} />
              {file ? (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{(file.size / 1024).toFixed(0)} KB · Click to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>☁️</div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Drop your PDF here</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>or click to browse your files</div>
                </div>
              )}
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          {uploading && (
            <div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, textAlign: 'center' }}>Uploading… {progress}%</div>
            </div>
          )}
          <button className="btn btn-primary btn-lg" type="submit" disabled={uploading} id="btn-upload-submit">
            {uploading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Uploading…</> : '⬆️ Upload Exam'}
          </button>
        </form>
      </div>
    </div>
  );
}
