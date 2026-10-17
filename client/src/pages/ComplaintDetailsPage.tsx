import { Link, useParams } from 'react-router-dom';
import { useComplaints, useVisibleComplaints } from '../context/ComplaintsContext';
import { useBase } from '../context/AuthContext';
import { CATEGORY_LABELS, locationText } from '../types/complaint';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { StatusTimeline } from '../components/StatusTimeline';
import { AiSummaryBox } from '../components/AiSummaryBox';
import { EmptyState } from '../components/EmptyState';
import { CategoryIcon, Icon } from '../components/Icon';
import { formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';

/** User view of one of their own complaints (read-only). */
export function ComplaintDetailsPage() {
  const { id } = useParams();
  const { setAiSummary } = useComplaints();
  const visible = useVisibleComplaints();
  const base = useBase();
  const { toast } = useToast();
  const c = visible.find((x) => x.id === id);

  if (!c) {
    return <EmptyState icon="search" title="Complaint not found" text={`There is no complaint with ID “${id}” available to you.`} action={<Link className="btn btn-primary" to={`${base}/complaints`}>Back to my complaints</Link>} />;
  }

  // Opens the browser's print dialog showing a clean record. Choose "Save as PDF" there to download a PDF.
  function printRecord() {
    if (typeof window.print !== 'function') { toast('Printing is not available in this browser.', 'error'); return; }
    const previousTitle = document.title;
    document.title = `Complaint ${c!.id}`; // becomes the default PDF file name
    const restore = () => { document.title = previousTitle; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  }

  return (
    <>
      <header className="print-only print-head">
        <strong>E-Campus Helpdesk</strong>
        <span>Complaint record · generated {formatDateTime(new Date().toISOString())}</span>
      </header>
      <Link className="back-link no-print" to={`${base}/complaints`}><Icon name="back" size={16} /> My complaints</Link>
      <header className="page-head page-head-row">
        <div>
          <div className="mono muted">{c.id}{c.isDemo && <span className="demo-tag">Sample</span>}</div>
          <h1>{c.title}</h1>
          <div className="row"><StatusBadge status={c.status} /><PriorityBadge priority={c.priority} /></div>
        </div>
        <button type="button" className="btn btn-secondary no-print" onClick={printRecord}>
          <Icon name="download" size={18} /> Download PDF / Print
        </button>
      </header>

      <div className="detail-grid">
        <div className="stack">
          <section className="card">
            <dl className="info-grid">
              <div><dt>Category</dt><dd><span className="cat"><CategoryIcon category={c.category} size={16} />{CATEGORY_LABELS[c.category]}</span></dd></div>
              <div><dt>Location</dt><dd>{locationText(c)}</dd></div>
              <div><dt>Submitted</dt><dd>{formatDateTime(c.createdAt)}</dd></div>
              <div><dt>Assigned to</dt><dd>{c.assignedTo ?? 'Not assigned yet'}</dd></div>
            </dl>
            <h2>Description</h2>
            <p className="pre">{c.description}</p>
            {c.imageData && (<><h2>Attached photo</h2><img className="detail-img" src={c.imageData} alt="Photo attached to this complaint" /></>)}
            <h2>AI summary</h2>
            {c.aiSummary ? <div className="ai-attached"><div><span className="ai-label">AI-suggested summary (not verified)</span><p>{c.aiSummary}</p></div></div> : <p className="muted small">No AI summary yet.</p>}
            <AiSummaryBox description={c.description} useLabel={c.aiSummary ? 'Replace saved summary' : 'Save this summary'} onUse={(s) => setAiSummary(c.id, s)} />
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <h2>Status timeline</h2>
            <StatusTimeline complaint={c} />
          </section>
          <section className="card">
            <h2>Admin resolution notes</h2>
            {c.resolutionNote ? (
              <>
                <p className="pre">{c.resolutionNote}</p>
                {c.resolvedAt && <p className="muted small">Resolved on {formatDateTime(c.resolvedAt)}</p>}
              </>
            ) : (
              <p className="muted small">No resolution notes yet. The administrator will add one when the issue is resolved.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
