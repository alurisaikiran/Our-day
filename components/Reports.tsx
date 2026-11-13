import { checkReport, deleteReport, uploadReport } from '@/app/actions';
import { FileIcon, X } from '@/components/Icons';
import AiText from '@/components/AiText';
import AutoRefresh from '@/components/AutoRefresh';
import type { Row } from '@/lib/db';
import { fmtStamp } from '@/lib/time';
import { aiEnabled } from '@/lib/ai';

export function ReportUpload() {
  return (
    <form action={uploadReport} className="row wrap">
      <label htmlFor="rep" style={{ position: 'absolute', left: -9999 }}>Report file</label>
      <input id="rep" name="report" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className="input grow" style={{ paddingTop: 10, minWidth: 180 }} />
      <button type="submit" className="btn btn-dark">Upload</button>
    </form>
  );
}

function AiPart({ r }: { r: Row }) {
  if (r.ai_status === 'off' || !r.ai_status) {
    if (!aiEnabled()) return <p className="tiny muted">AI report check is off. Add ANTHROPIC_API_KEY in Vercel to turn it on.</p>;
    return (
      <form action={checkReport.bind(null, r.id)}>
        <button type="submit" className="btn" style={{ minHeight: 38, color: 'var(--indigo-dark)' }}>Explain with AI</button>
      </form>
    );
  }
  if (r.ai_status === 'working') {
    return <p className="notice soft-indigo small" role="status">AI is reading this report… this takes about 20–40 seconds.</p>;
  }
  return (
    <details className="ai-box" open={r.ai_status === 'done' ? undefined : true}>
      <summary className="small bold" style={{ cursor: 'pointer', color: 'var(--indigo-dark)', minHeight: 32, display: 'flex', alignItems: 'center' }}>
        {r.ai_status === 'done' ? 'AI summary of this report' : 'AI could not read this report'}
      </summary>
      <div className="notice soft-indigo" style={{ marginTop: 6, color: 'var(--ink)' }}>
        {r.ai_summary ? <AiText text={r.ai_summary} /> : null}
        <form action={checkReport.bind(null, r.id)} style={{ marginTop: 10 }}>
          <button type="submit" className="btn" style={{ minHeight: 38 }}>Check again</button>
        </form>
      </div>
    </details>
  );
}

export function ReportList({ reports }: { reports: Row[] }) {
  if (!reports.length) return <p className="empty">No reports uploaded yet.</p>;
  const working = reports.some((r) => r.ai_status === 'working');
  return (
    <div className="card" style={{ padding: '4px 14px' }}>
      <AutoRefresh active={working} />
      {reports.map((r, n) => (
        <div key={r.id} className="stack-sm" style={{ padding: '10px 0', borderTop: n ? '1px solid #ECEEF4' : 'none', gap: 8 }}>
          <div className="row">
            <span className="muted"><FileIcon /></span>
            <div className="grow stack-sm" style={{ gap: 2 }}>
              <span className="bold small" style={{ wordBreak: 'break-word' }}>{r.name}</span>
              <span className="tiny muted">{fmtStamp(r.uploaded_at)}</span>
            </div>
            <a href={r.url} target="_blank" rel="noreferrer" className="small bold">View</a>
            <form action={deleteReport.bind(null, r.id)}>
              <button type="submit" className="icon-btn" style={{ background: 'transparent' }} aria-label={`Delete ${r.name}`}><X size={16} /></button>
            </form>
          </div>
          <AiPart r={r} />
        </div>
      ))}
    </div>
  );
}
