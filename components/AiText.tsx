import { Fragment } from 'react';

/** Renders the AI's simple markdown (## headings, - bullets, **bold**, _italic_) safely as React elements. */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p.startsWith('_') && p.endsWith('_') && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em>
      : <Fragment key={i}>{p}</Fragment>);
}

export default function AiText({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={`u${out.length}`} style={{ margin: '0 0 4px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (/^[-*•]\s+/.test(line)) { list.push(line.replace(/^[-*•]\s+/, '')); continue; }
    flush();
    if (!line) continue;
    if (/^#{1,4}\s+/.test(line)) out.push(<h3 key={out.length} style={{ fontSize: 15, marginTop: 6 }}>{inline(line.replace(/^#+\s+/, ''))}</h3>);
    else out.push(<p key={out.length} style={{ lineHeight: 1.5 }}>{inline(line)}</p>);
  }
  flush();
  return <div className="stack-sm ai-text" style={{ gap: 8, fontSize: 14, lineHeight: 1.5 }}>{out}</div>;
}
