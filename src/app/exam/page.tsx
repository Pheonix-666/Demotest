'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    pdfjsLib: any;
    jspdf: any;
  }
}

interface Stroke {
  type: 'pen' | 'hi' | 'erase';
  color: string;
  thickness: number;
  opacity: number;
  points: { x: number; y: number }[];
}

interface ExamInfo {
  id: string;
  title: string;
  description: string;
  fileName: string;
}

export default function ExamPage() {
  const router = useRouter();
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [libsReady, setLibsReady] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<'pen' | 'hi' | 'er'>('pen');
  const [color, setColor] = useState('#5b6ef5');
  const [thickness, setThickness] = useState(3);
  const [ann, setAnn] = useState<Record<number, Stroke[]>>({});
  const [hist, setHist] = useState<Record<number, Stroke[][]>>({});
  const [hidx, setHidx] = useState<Record<number, number>>({});
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [sidebar, setSidebar] = useState(false);
  const [toast, setToast] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [exportPct, setExportPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  const drawingRef = useRef(false);
  const curStrokeRef = useRef<Stroke | null>(null);
  const lxRef = useRef(0);
  const lyRef = useRef(0);
  const annRef = useRef<Record<number, Stroke[]>>({});
  const pageRef = useRef(1);
  const toolRef = useRef<'pen' | 'hi' | 'er'>('pen');
  const colorRef = useRef('#5b6ef5');
  const thicknessRef = useRef(3);
  const zoomRef = useRef(1);
  const pdfDocRef = useRef<any>(null);
  const totalRef = useRef(0);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync refs
  useEffect(() => { annRef.current = ann; }, [ann]);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { thicknessRef.current = thickness; }, [thickness]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { pdfDocRef.current = pdfDoc; }, [pdfDoc]);
  useEffect(() => { totalRef.current = total; }, [total]);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2800);
  }

  // Load session data + external libs
  useEffect(() => {
    const name = sessionStorage.getItem('student_name');
    const id = sessionStorage.getItem('student_id');
    const exam = sessionStorage.getItem('selected_exam');
    if (!name || !id || !exam) { router.replace('/'); return; }
    setStudentName(name);
    setStudentId(id);
    setExamInfo(JSON.parse(exam));

    // Load PDF.js and jsPDF
    const loadScript = (src: string) => new Promise<void>((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = () => res(); s.onerror = rej;
      document.head.appendChild(s);
    });
    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
    ]).then(() => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setLibsReady(true);
    });
  }, [router]);

  // Load PDF after libs ready
  useEffect(() => {
    if (!libsReady || !examInfo) return;
    fetch(`/api/exams/${examInfo.id}/file`)
      .then(r => r.arrayBuffer())
      .then(async buf => {
        const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        setPdfDoc(doc);
        setTotal(doc.numPages);
        setPdfLoaded(true);
      })
      .catch(() => showToast('Failed to load PDF.'));
  }, [libsReady, examInfo]);

  // Render page
  const renderPage = useCallback(async (n: number, z: number, doc: any) => {
    if (!doc || !pdfCanvasRef.current || !drawCanvasRef.current) return;
    const pg = await doc.getPage(n);
    const vp = pg.getViewport({ scale: z * 1.5 });
    const pc = pdfCanvasRef.current;
    const dc = drawCanvasRef.current;
    pc.width = dc.width = vp.width;
    pc.height = dc.height = vp.height;
    const wrap = pc.parentElement as HTMLElement;
    if (wrap) { wrap.style.width = vp.width + 'px'; wrap.style.height = vp.height + 'px'; }
    await pg.render({ canvasContext: pc.getContext('2d')!, viewport: vp }).promise;
    // Redraw annotations
    const ctx = dc.getContext('2d')!;
    ctx.clearRect(0, 0, dc.width, dc.height);
    (annRef.current[n] || []).forEach(s => drawStrokeOnCtx(ctx, s));
  }, []);

  useEffect(() => {
    if (pdfLoaded && pdfDoc) renderPage(page, zoom, pdfDoc);
  }, [page, zoom, pdfDoc, pdfLoaded, renderPage]);

  function drawStrokeOnCtx(ctx: CanvasRenderingContext2D, s: Stroke) {
    if (!s.points || s.points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = s.opacity;
    ctx.globalCompositeOperation = s.type === 'erase' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.color; ctx.lineWidth = s.thickness;
    ctx.lineCap = s.type === 'hi' ? 'square' : 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke(); ctx.restore();
  }

  // Drawing handlers
  function getPos(e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) {
    const dc = drawCanvasRef.current!;
    const r = dc.getBoundingClientRect();
    const sx = dc.width / r.width, sy = dc.height / r.height;
    const src = 'touches' in e ? (e as TouchEvent).touches[0] : e as MouseEvent;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  function onPointerDown(e: React.MouseEvent | React.TouchEvent) {
    if (!pdfDocRef.current) return;
    e.preventDefault();
    drawingRef.current = true;
    const p = getPos(e.nativeEvent as MouseEvent | TouchEvent);
    lxRef.current = p.x; lyRef.current = p.y;
    const t = toolRef.current;
    curStrokeRef.current = {
      type: t === 'er' ? 'erase' : t,
      color: colorRef.current,
      thickness: t === 'hi' ? thicknessRef.current * 6 : t === 'er' ? thicknessRef.current * 8 : thicknessRef.current,
      opacity: t === 'hi' ? 0.4 : 1,
      points: [{ x: p.x, y: p.y }],
    };
  }

  function onPointerMove(e: React.MouseEvent | React.TouchEvent) {
    if (!drawingRef.current || !curStrokeRef.current) return;
    e.preventDefault();
    const p = getPos(e.nativeEvent as MouseEvent | TouchEvent);
    curStrokeRef.current.points.push({ x: p.x, y: p.y });
    const ctx = drawCanvasRef.current!.getContext('2d')!;
    ctx.save();
    ctx.globalAlpha = curStrokeRef.current.opacity;
    ctx.globalCompositeOperation = curStrokeRef.current.type === 'erase' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = curStrokeRef.current.color;
    ctx.lineWidth = curStrokeRef.current.thickness;
    ctx.lineCap = curStrokeRef.current.type === 'hi' ? 'square' : 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(lxRef.current, lyRef.current); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.restore();
    lxRef.current = p.x; lyRef.current = p.y;
  }

  function onPointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const stroke = curStrokeRef.current;
    if (!stroke || stroke.points.length < 2) { curStrokeRef.current = null; return; }
    const pg = pageRef.current;
    setAnn(prev => {
      const cur = [...(prev[pg] || []), stroke];
      annRef.current = { ...prev, [pg]: cur };
      return { ...prev, [pg]: cur };
    });
    setHist(prev => {
      const base = prev[pg] || [[]];
      const idx = (hidx[pg] ?? 0);
      const newHist = [...base.slice(0, idx + 1), [...(annRef.current[pg] || [])]];
      return { ...prev, [pg]: newHist };
    });
    setHidx(prev => ({ ...prev, [pg]: (prev[pg] ?? 0) + 1 }));
    curStrokeRef.current = null;
  }

  function undo() {
    const pg = page;
    const h = hist[pg]; const i = hidx[pg] ?? 0;
    if (!h || i <= 0) { showToast('Nothing to undo.'); return; }
    const ni = i - 1;
    setHidx(prev => ({ ...prev, [pg]: ni }));
    const strokes = h[ni] || [];
    setAnn(prev => { annRef.current = { ...prev, [pg]: strokes }; return { ...prev, [pg]: strokes }; });
    if (pdfDoc) renderPage(pg, zoom, pdfDoc);
  }

  function redo() {
    const pg = page;
    const h = hist[pg]; const i = hidx[pg] ?? 0;
    if (!h || i >= h.length - 1) { showToast('Nothing to redo.'); return; }
    const ni = i + 1;
    setHidx(prev => ({ ...prev, [pg]: ni }));
    const strokes = h[ni] || [];
    setAnn(prev => { annRef.current = { ...prev, [pg]: strokes }; return { ...prev, [pg]: strokes }; });
    if (pdfDoc) renderPage(pg, zoom, pdfDoc);
  }

  function clearPage() {
    const pg = page;
    setAnn(prev => { annRef.current = { ...prev, [pg]: [] }; return { ...prev, [pg]: [] }; });
    setHist(prev => {
      const base = prev[pg] || [[]];
      const idx = hidx[pg] ?? 0;
      return { ...prev, [pg]: [...base.slice(0, idx + 1), []] };
    });
    setHidx(prev => ({ ...prev, [pg]: (prev[pg] ?? 0) + 1 }));
    if (pdfDoc) renderPage(pg, zoom, pdfDoc);
    setShowClearModal(false);
    showToast('Page cleared. (Ctrl+Z to undo)');
  }

  // Export + Submit
  async function exportAndSubmit() {
    if (!pdfDoc) return;
    setShowSubmitModal(false);
    setExporting(true);
    setExportPct(0);
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'px', compress: true });
      let first = true;
      for (let pg = 1; pg <= total; pg++) {
        setExportMsg(`Rendering page ${pg} of ${total}…`);
        setExportPct(Math.round((pg / total) * 90));
        const pPage = await pdfDoc.getPage(pg);
        const vp = pPage.getViewport({ scale: 2.0 });
        const tc = document.createElement('canvas'); tc.width = vp.width; tc.height = vp.height;
        await pPage.render({ canvasContext: tc.getContext('2d')!, viewport: vp }).promise;
        const ac = document.createElement('canvas'); ac.width = vp.width; ac.height = vp.height;
        const actx = ac.getContext('2d')!;
        actx.drawImage(tc, 0, 0);
        const scx = vp.width / (pdfCanvasRef.current?.width || vp.width);
        const scy = vp.height / (pdfCanvasRef.current?.height || vp.height);
        (annRef.current[pg] || []).forEach(s => {
          if (!s.points || s.points.length < 2) return;
          actx.save(); actx.globalAlpha = s.opacity;
          actx.globalCompositeOperation = s.type === 'erase' ? 'destination-out' : 'source-over';
          actx.strokeStyle = s.color; actx.lineWidth = s.thickness * scx;
          actx.lineCap = s.type === 'hi' ? 'square' : 'round'; actx.lineJoin = 'round';
          actx.beginPath(); actx.moveTo(s.points[0].x * scx, s.points[0].y * scy);
          for (let i = 1; i < s.points.length; i++) actx.lineTo(s.points[i].x * scx, s.points[i].y * scy);
          actx.stroke(); actx.restore();
        });
        const imgData = ac.toDataURL('image/jpeg', 0.92);
        const pw = vp.width * 0.75, ph = vp.height * 0.75;
        if (!first) pdf.addPage([pw, ph], pw > ph ? 'l' : 'p');
        else { pdf.internal.pageSize.width = pw; pdf.internal.pageSize.height = ph; }
        pdf.addImage(imgData, 'JPEG', 0, 0, pw, ph);
        first = false;
        await new Promise(r => setTimeout(r, 10));
      }
      setExportMsg('Uploading submission…');
      setExportPct(95);
      const pdfBlob = pdf.output('blob');
      const formData = new FormData();
      formData.append('file', pdfBlob, `submission-${studentId}-${examInfo?.id}.pdf`);
      formData.append('examId', examInfo?.id || '');
      formData.append('examTitle', examInfo?.title || '');
      formData.append('studentName', studentName);
      formData.append('studentId', studentId);
      setSubmitting(true);
      const res = await fetch('/api/submissions/upload', { method: 'POST', body: formData });
      const result = await res.json();
      setExportPct(100);
      setExporting(false); setSubmitting(false);
      if (result.success) {
        showToast('✅ Exam submitted successfully!');
        setTimeout(() => router.replace('/'), 2500);
      } else {
        showToast('Submission failed: ' + result.error);
      }
    } catch (err: any) {
      setExporting(false); setSubmitting(false);
      showToast('Export failed: ' + err.message);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') setPage(p => Math.max(1, p - 1));
      else if (e.key === 'ArrowRight') setPage(p => Math.min(totalRef.current, p + 1));
      else if (e.key === 'p' || e.key === 'P') setTool('pen');
      else if (e.key === 'h' || e.key === 'H') setTool('hi');
      else if (e.key === 'e' || e.key === 'E') setTool('er');
      else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
      else if ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); redo(); }
      else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(4, z + 0.25));
      else if (e.key === '-') setZoom(z => Math.max(0.25, z - 0.25));
      else if (e.key === '0') setZoom(1);
      else if (e.key === 'Escape') { setShowSubmitModal(false); setShowClearModal(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hist, hidx]);

  const colors = [
    { c: '#5b6ef5', l: 'Blue' }, { c: '#f43f5e', l: 'Red' }, { c: '#4ade80', l: 'Green' },
    { c: '#facc15', l: 'Yellow' }, { c: '#fb923c', l: 'Orange' }, { c: '#e879f9', l: 'Pink' },
    { c: '#ffffff', l: 'White' }, { c: '#1e1e2e', l: 'Black' },
  ];

  const cursorStyle = tool === 'er' ? 'cell' : 'crosshair';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 100,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px',
        overflowX: 'auto', flexShrink: 0, userSelect: 'none'
      }}>
        {/* Brand */}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap', marginRight: 4 }}>
          📄 {examInfo?.title || 'Exam'}
        </span>
        <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Pages sidebar toggle */}
        <TbBtn title="Toggle pages (S)" active={sidebar} onClick={() => setSidebar(s => !s)}>
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="6" height="18" rx="1"/><line x1="13" y1="7" x2="21" y2="7"/><line x1="13" y1="12" x2="21" y2="12"/><line x1="13" y1="17" x2="21" y2="17"/></svg>
        </TbBtn>
        <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Navigation */}
        <TbBtn title="Previous page (←)" onClick={() => setPage(p => Math.max(1, p - 1))}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </TbBtn>
        <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          Page <b style={{ color: 'var(--text)' }}>{pdfLoaded ? page : '—'}</b> / <b style={{ color: 'var(--text)' }}>{pdfLoaded ? total : '—'}</b>
        </span>
        <TbBtn title="Next page (→)" onClick={() => setPage(p => Math.min(total, p + 1))}>
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </TbBtn>
        <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Tools */}
        <TbBtn title="Pen (P)" active={tool === 'pen'} onClick={() => setTool('pen')}>
          <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        </TbBtn>
        <TbBtn title="Highlighter (H)" activeHi={tool === 'hi'} onClick={() => setTool('hi')}>
          <svg viewBox="0 0 24 24"><rect x="4" y="14" width="16" height="6" rx="1"/><path d="M7 14l5-10 5 10"/><line x1="9" y1="10" x2="15" y2="10"/></svg>
        </TbBtn>
        <TbBtn title="Eraser (E)" active={tool === 'er'} onClick={() => setTool('er')}>
          <svg viewBox="0 0 24 24"><path d="M20 20H7L3 16l12-12 7 7-2 9z"/><line x1="6" y1="14" x2="14" y2="6"/></svg>
        </TbBtn>
        <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Colors */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {colors.map(({ c, l }) => (
            <button key={c} title={l} onClick={() => { setColor(c); if (tool === 'er') setTool('pen'); }}
              style={{
                width: 20, height: 20, borderRadius: '50%', background: c, border: color === c ? '2px solid #fff' : '2px solid rgba(255,255,255,0.15)',
                cursor: 'pointer', transform: color === c ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.12s', flexShrink: 0
              }} />
          ))}
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Size</span>
          <input type="range" min={1} max={20} value={thickness} onChange={e => setThickness(+e.target.value)}
            style={{ width: 64, accentColor: 'var(--accent)', cursor: 'pointer' }} />
          <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 18 }}>{thickness}</span>
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Undo/Redo/Clear */}
        <TbBtn title="Undo (Ctrl+Z)" onClick={undo}>
          <svg viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
        </TbBtn>
        <TbBtn title="Redo (Ctrl+Y)" onClick={redo}>
          <svg viewBox="0 0 24 24"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
        </TbBtn>
        <TbBtn title="Clear page" onClick={() => { if (ann[page]?.length) setShowClearModal(true); else showToast('No annotations on this page.'); }}>
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </TbBtn>
        <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Zoom */}
        <TbBtn title="Zoom out (-)" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </TbBtn>
        <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 40, textAlign: 'center', whiteSpace: 'nowrap' }}>{Math.round(zoom * 100)}%</span>
        <TbBtn title="Zoom in (+)" onClick={() => setZoom(z => Math.min(4, z + 0.25))}>
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </TbBtn>
        <TbBtn title="Reset zoom (0)" onClick={() => setZoom(1)}>
          <svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        </TbBtn>
        <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Bookmark */}
        <TbBtn title="Bookmark page (B)" onClick={() => {
          setBookmarks(prev => { const n = new Set(prev); n.has(page) ? n.delete(page) : n.add(page); showToast(n.has(page) ? `Page ${page} bookmarked 📌` : `Bookmark removed`); return n; });
        }} style={{ color: bookmarks.has(page) ? '#f59e0b' : undefined }}>
          <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </TbBtn>
        <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Student info */}
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', marginRight: 4 }}>
          👤 {studentName} · {studentId}
        </span>

        {/* Submit */}
        <button onClick={() => { if (pdfLoaded) setShowSubmitModal(true); else showToast('PDF not loaded yet.'); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', height: 36,
            background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'filter 0.15s'
          }}
          id="btn-submit"
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
          onMouseLeave={e => (e.currentTarget.style.filter = '')}>
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Submit Exam
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 56, left: 0, right: 0, height: 3, background: 'var(--border)', zIndex: 99 }}>
        <div style={{ height: '100%', background: 'var(--accent)', transition: 'width 0.3s', width: total > 0 ? `${(page / total) * 100}%` : '0%' }} />
      </div>

      {/* Main */}
      <div style={{ display: 'flex', marginTop: 56, height: 'calc(100vh - 56px - 32px)', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: sidebar ? 180 : 0, overflow: 'hidden', background: 'var(--surface)',
          borderRight: '1px solid var(--border)', transition: 'width 0.25s', flexShrink: 0,
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', padding: '12px 12px 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Pages</div>
          <div ref={thumbsRef} style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pdfLoaded && Array.from({ length: total }, (_, i) => i + 1).map(n => (
              <PageThumb key={n} pageNum={n} pdfDoc={pdfDoc} active={page === n} bookmarked={bookmarks.has(n)} onClick={() => setPage(n)} />
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div ref={wrapRef} style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, background: '#0a0c14' }}>
          {!pdfLoaded ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: 'var(--muted)' }}>
              <div className="spinner" style={{ width: 36, height: 36 }} />
              <span>Loading exam PDF…</span>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <canvas ref={pdfCanvasRef} style={{ display: 'block' }} />
              <canvas ref={drawCanvasRef} style={{ position: 'absolute', top: 0, left: 0, cursor: cursorStyle, touchAction: 'none' }}
                onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
                onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp} />
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 32,
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px',
        fontSize: 11, color: 'var(--muted)', zIndex: 100
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: pdfLoaded ? 'var(--accent2)' : 'var(--muted)' }} />
        <span>{pdfLoaded ? `${examInfo?.title} · ${total} pages` : 'Loading…'}</span>
        <span style={{ marginLeft: 'auto' }}>P Pen · H Highlight · E Erase · ←→ Navigate · Ctrl+Z/Y Undo/Redo · +/- Zoom</span>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="modal-backdrop" onClick={() => setShowSubmitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Submit your exam?</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
              All annotations will be merged with the PDF and submitted to your instructor. <strong style={{ color: 'var(--text)' }}>This cannot be undone.</strong>
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setShowSubmitModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={exportAndSubmit} id="btn-confirm-submit">Submit & Upload →</button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Modal */}
      {showClearModal && (
        <div className="modal-backdrop" onClick={() => setShowClearModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Clear this page?</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>All annotations on page {page} will be removed. You can undo with Ctrl+Z.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setShowClearModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={clearPage}>Clear Page</button>
            </div>
          </div>
        </div>
      )}

      {/* Export overlay */}
      {exporting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px', textAlign: 'center', minWidth: 300 }}>
            <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{submitting ? 'Uploading…' : 'Generating PDF…'}</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>{exportMsg}</p>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${exportPct}%` }} /></div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>{exportPct}%</div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 44, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '10px 20px', fontSize: 13, color: 'var(--text)', zIndex: 300,
          whiteSpace: 'nowrap', maxWidth: '90vw', overflow: 'hidden', textOverflow: 'ellipsis',
          animation: 'fadeInUp 0.25s ease'
        }}>{toast}</div>
      )}
    </div>
  );
}

// ── Helper Components ──
function TbBtn({ children, title, active, activeHi, onClick, style }: {
  children: React.ReactNode; title?: string; active?: boolean; activeHi?: boolean;
  onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <button title={title} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 36, height: 36, borderRadius: 8, border: '1px solid transparent',
      background: active ? 'var(--accent)' : activeHi ? 'rgba(250,204,21,0.2)' : 'transparent',
      color: active ? '#fff' : activeHi ? '#facc15' : 'var(--muted)',
      borderColor: activeHi ? 'rgba(250,204,21,0.35)' : 'transparent',
      cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', ...style,
    }}
      onMouseEnter={e => { if (!active && !activeHi) { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; } }}
      onMouseLeave={e => { if (!active && !activeHi) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; } }}
    >
      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

function PageThumb({ pageNum, pdfDoc, active, bookmarked, onClick }: {
  pageNum: number; pdfDoc: any; active: boolean; bookmarked: boolean; onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    (async () => {
      const pg = await pdfDoc.getPage(pageNum);
      const vp = pg.getViewport({ scale: 0.2 });
      const c = canvasRef.current!;
      c.width = vp.width; c.height = vp.height;
      await pg.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
    })();
  }, [pdfDoc, pageNum]);
  return (
    <div onClick={onClick} style={{
      borderRadius: 6, border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      cursor: 'pointer', overflow: 'hidden', position: 'relative',
      background: 'var(--surface2)', transition: 'border-color 0.15s'
    }}>
      <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} />
      <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', padding: '2px 0 4px' }}>{pageNum}</div>
      {bookmarked && <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />}
    </div>
  );
}
