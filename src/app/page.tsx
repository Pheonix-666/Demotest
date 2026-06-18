'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Exam {
  id: string;
  title: string;
  description: string;
  fileName: string;
  deadline?: string;
  isActive: boolean;
  uploadedAt: string;
}

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<'login' | 'pick'>('login');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim() || !studentId.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/exams');
      const data = await res.json();
      setExams(data.exams?.filter((ex: Exam) => ex.isActive) || []);
      sessionStorage.setItem('student_name', studentName.trim());
      sessionStorage.setItem('student_id', studentId.trim());
      setStep('pick');
      setError('');
    } catch {
      setError('Unable to load exams. Please try again.');
    }
    setLoading(false);
  }

  function handleSelectExam(exam: Exam) {
    sessionStorage.setItem('selected_exam', JSON.stringify(exam));
    router.push('/exam');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Animated background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(91,110,245,0.18) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Nav */}
      <nav className="nav" style={{ position: 'relative', zIndex: 10 }}>
        <span className="nav-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
          </svg>
          ExamPortal
        </span>
        <div className="nav-links">
          <button className="nav-link" onClick={() => router.push('/admin')}>Admin Login</button>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          {step === 'login' ? (
            <div className="animate-fadeInUp">
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '20px',
                  background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(91,110,245,0.4)'
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <line x1="10" y1="9" x2="8" y2="9"/>
                  </svg>
                </div>
                <h1 className="page-title">Welcome to ExamPortal</h1>
                <p className="page-sub" style={{ marginTop: '8px' }}>Enter your details to access your assigned exam</p>
              </div>

              <div className="card">
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="form-group">
                    <label className="label">Full Name</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Jane Smith"
                      value={studentName}
                      onChange={e => setStudentName(e.target.value)}
                      id="student-name"
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Student / Roll Number</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. CS2024-001"
                      value={studentId}
                      onChange={e => setStudentId(e.target.value)}
                      id="student-id"
                    />
                  </div>
                  {error && <div className="alert alert-error">{error}</div>}
                  <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} id="btn-enter">
                    {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Loading Exams…</> : 'Enter Exam Portal →'}
                  </button>
                </form>
              </div>

              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted)' }}>
                Are you an administrator?{' '}
                <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit' }}>
                  Go to Admin Panel →
                </button>
              </p>
            </div>
          ) : (
            <div className="animate-fadeInUp">
              <div style={{ marginBottom: '24px' }}>
                <button onClick={() => setStep('login')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', marginBottom: '16px' }}>
                  ← Back
                </button>
                <h1 className="page-title" style={{ fontSize: '22px' }}>Select Your Exam</h1>
                <p className="page-sub">Hello, <strong style={{ color: 'var(--text)' }}>{studentName}</strong> · ID: {studentId}</p>
              </div>

              {exams.length === 0 ? (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <div className="empty-title">No Active Exams</div>
                    <div className="empty-sub">No exams are currently available. Please check back later or contact your administrator.</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {exams.map(exam => {
                    const isExpired = exam.deadline ? new Date(exam.deadline) < new Date() : false;
                    return (
                      <button
                        key={exam.id}
                        onClick={() => !isExpired && handleSelectExam(exam)}
                        disabled={isExpired}
                        style={{
                          background: isExpired ? 'var(--surface2)' : 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-lg)', padding: '20px 24px',
                          textAlign: 'left', cursor: isExpired ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                          width: '100%', color: 'inherit', fontFamily: 'inherit',
                          opacity: isExpired ? 0.65 : 1
                        }}
                        onMouseEnter={e => {
                          if (isExpired) return;
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--glow)';
                        }}
                        onMouseLeave={e => {
                          if (isExpired) return;
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        }}
                        id={`exam-${exam.id}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '16px', color: isExpired ? 'var(--muted)' : 'var(--text)', marginBottom: '4px' }}>{exam.title}</div>
                            {exam.description && <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>{exam.description}</div>}
                            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                              {exam.deadline && (
                                <span style={{ color: isExpired ? 'var(--danger)' : 'var(--muted)' }}>
                                  ⏰ {isExpired ? 'Expired' : 'Due'}: {new Date(exam.deadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} IST
                                </span>
                              )}
                              <span>📄 {exam.fileName}</span>
                            </div>
                          </div>
                          {isExpired ? (
                            <span className="badge badge-danger">Expired</span>
                          ) : (
                            <span className="badge badge-success">Active</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
