import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../types/complaint';
import { useComplaints } from '../context/ComplaintsContext';
import { useAuth, useBase } from '../context/AuthContext';
import { imageToDataUrl, validateImage } from '../utils/image';
import { AiSummaryBox } from './AiSummaryBox';
import { Icon } from './Icon';

const MIN_DESC = 10;
const MAX_DESC = 1000;
type Errors = Partial<Record<'title' | 'category' | 'building' | 'room' | 'description', string>>;

export function ComplaintForm() {
  const { addComplaint } = useComplaints();
  const { session } = useAuth();
  const base = useBase();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [campus, setCampus] = useState('');
  const [building, setBuilding] = useState('');
  const [area, setArea] = useState('');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | undefined>();
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false); // blocks double clicks immediately
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = validateImage(file);
    if (problem) { setImageError(problem); return; }
    setProcessing(true);
    try {
      setImageData(await imageToDataUrl(file));
      setImageError(null);
    } catch (err) {
      setImageError((err as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  function validate() {
    const next: Errors = {};
    const t = title.trim();
    if (!t) next.title = 'Please enter a short title for the issue.';
    else if (t.length < 5) next.title = 'The title should be at least 5 characters.';
    else if (t.length > 100) next.title = 'Please keep the title under 100 characters.';
    if (!category) next.category = 'Please choose an issue category.';
    if (!building.trim()) next.building = 'Please enter the building.';
    if (!room.trim()) next.room = 'Please enter the room or location.';
    const d = description.trim();
    if (!d) next.description = 'Please describe the problem.';
    else if (d.length < MIN_DESC) next.description = `Please give a little more detail (at least ${MIN_DESC} characters).`;
    else if (d.length > MAX_DESC) next.description = `Please keep the description under ${MAX_DESC} characters.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submittingRef.current || processing) return;
    setSubmitError(null);
    if (!validate() || !category) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const c = addComplaint({ title, category, campus, building, area, room, description, imageData, aiSummary: aiSummary?.trim() || undefined, submittedBy: session?.id.toLowerCase() });
      setSubmittedId(c.id);
    } catch {
      setSubmitError('Something went wrong while saving the complaint. Please try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function reset() {
    setTitle(''); setCategory(''); setCampus(''); setBuilding(''); setArea(''); setRoom(''); setDescription('');
    setImageData(undefined); setAiSummary(undefined); setErrors({}); setSubmittedId(null); setImageError(null);
  }

  if (submittedId) {
    return (
      <div className="card success-card" role="status">
        <span className="success-icon"><Icon name="done" size={30} /></span>
        <h2>Complaint submitted</h2>
        <p className="muted">Your complaint ID is:</p>
        <p className="ref-big">{submittedId}</p>
        <p className="muted small">Saved in this browser only. Keep the ID to find the complaint later.</p>
        <div className="row">
          <Link className="btn btn-primary" to={`${base}/complaints/${submittedId}`}>View complaint</Link>
          <button type="button" className="btn btn-secondary" onClick={reset}>Report another issue</button>
        </div>
      </div>
    );
  }

  const field = (id: keyof Errors) => ({ 'aria-invalid': !!errors[id], 'aria-describedby': errors[id] ? `${id}-err` : undefined });
  const err = (id: keyof Errors) => errors[id] && <p id={`${id}-err`} className="field-error" role="alert">{errors[id]}</p>;

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="title">Issue title <span className="req" aria-hidden="true">*</span></label>
        <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Projector not turning on" maxLength={120} {...field('title')} />
        {err('title')}
      </div>

      <div className="field">
        <label htmlFor="category">Category <span className="req" aria-hidden="true">*</span></label>
        <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value as Category | '')} {...field('category')}>
          <option value="">Select a category…</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        {err('category')}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="campus">Campus <span className="muted small">(if applicable)</span></label>
          <input id="campus" className="input" value={campus} onChange={(e) => setCampus(e.target.value)} placeholder="e.g. Main Campus" maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="area">Affected area or department <span className="muted small">(optional)</span></label>
          <input id="area" className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Computer Science Department" maxLength={80} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="building">Building <span className="req" aria-hidden="true">*</span></label>
          <input id="building" className="input" value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="e.g. Block A" {...field('building')} />
          {err('building')}
        </div>
        <div className="field">
          <label htmlFor="room">Room / location <span className="req" aria-hidden="true">*</span></label>
          <input id="room" className="input" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Room 101" {...field('room')} />
          {err('room')}
        </div>
      </div>

      <div className="field">
        <label htmlFor="description">Description <span className="req" aria-hidden="true">*</span></label>
        <textarea id="description" className="input" rows={5} value={description} maxLength={MAX_DESC + 200} onChange={(e) => setDescription(e.target.value)} placeholder="What is wrong? When did it start? Anything that helps the technician." {...field('description')} />
        <div className="field-meta">
          {err('description') || <span />}
          <span className="muted small">{description.trim().length}/{MAX_DESC}</span>
        </div>
        <AiSummaryBox description={description} useLabel="Attach this summary" onUse={setAiSummary} />
        {aiSummary !== undefined && (
          <div className="ai-attached ai-edit">
            <div className="field">
              <label htmlFor="ai-summary" className="ai-label">Attached AI summary (suggested). You can edit it before submitting.</label>
              <textarea id="ai-summary" className="input" rows={2} maxLength={300} value={aiSummary} onChange={(e) => setAiSummary(e.target.value)} />
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAiSummary(undefined)}>Remove</button>
          </div>
        )}
      </div>

      <div className="field">
        <span className="label">Photo (optional)</span>
        <input ref={fileRef} id="picture" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="visually-hidden" aria-label="Choose a photo" />
        {processing ? (
          <p className="muted" role="status"><Icon name="loader" size={16} className="spin" /> Processing photo…</p>
        ) : imageData ? (
          <div className="preview">
            <img src={imageData} alt="Selected attachment preview" />
            <div className="row">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>Replace</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImageData(undefined); setImageError(null); }}><Icon name="x" size={14} /> Remove</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary upload-btn" onClick={() => fileRef.current?.click()}>
            <Icon name="image" size={18} /> Choose a photo
          </button>
        )}
        <p className="muted small">JPG, PNG or WebP, up to 5 MB. Stored only in this browser and never sent to Gemini.</p>
        {imageError && <p className="field-error" role="alert">{imageError}</p>}
      </div>

      {submitError && <div className="alert alert-error" role="alert"><Icon name="alert" size={18} /><span>{submitError}</span></div>}
      <div className="row form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting || processing}>{submitting ? 'Submitting…' : 'Submit Complaint'}</button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(base)}>Cancel</button>
      </div>
    </form>
  );
}
