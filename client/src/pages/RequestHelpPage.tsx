import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { HELP_CATEGORIES } from '../utils/requestConfig';
import { useRequests } from '../context/RequestsContext';
import { useAuth, useBase } from '../context/AuthContext';
import { RequestSuccessCard } from '../components/RequestSuccessCard';
import { Icon } from '../components/Icon';

const MIN_DESC = 10;
const MAX_DESC = 1000;
type Errors = Partial<Record<'title' | 'category' | 'description', string>>;

/** Help requests: support that is not a maintenance problem (academic, registration, exams, fees, IT accounts...). */
export function RequestHelpPage() {
  const { addRequest } = useRequests();
  const { session } = useAuth();
  const base = useBase();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState(session?.department ?? '');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const busy = useRef(false); // blocks double clicks immediately

  function validate(): boolean {
    const next: Errors = {};
    const t = title.trim();
    if (!t) next.title = 'Please enter a short title for your request.';
    else if (t.length < 5) next.title = 'The title should be at least 5 characters.';
    else if (t.length > 100) next.title = 'Please keep the title under 100 characters.';
    if (!category) next.category = 'Please choose a help category.';
    const d = description.trim();
    if (!d) next.description = 'Please describe what you need help with.';
    else if (d.length < MIN_DESC) next.description = `Please give a little more detail (at least ${MIN_DESC} characters).`;
    else if (d.length > MAX_DESC) next.description = `Please keep the description under ${MAX_DESC} characters.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy.current || !session) return;
    setSubmitError(null);
    if (!validate()) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    busy.current = true;
    try {
      const r = addRequest({
        kind: 'help', title, category, department, description,
        submittedBy: session.id.toLowerCase(), submitterName: session.name, submitterType: session.userType,
      });
      setSubmittedId(r.id);
    } catch {
      setSubmitError('Something went wrong while saving your request. Please try again.');
    } finally {
      busy.current = false;
    }
  }

  function reset() {
    setTitle(''); setCategory(''); setDescription(''); setErrors({}); setSubmittedId(null);
  }

  const field = (id: keyof Errors) => ({ 'aria-invalid': !!errors[id], 'aria-describedby': errors[id] ? `${id}-err` : undefined });
  const err = (id: keyof Errors) => errors[id] && <p id={`${id}-err`} className="field-error" role="alert">{errors[id]}</p>;

  return (
    <>
      <header className="page-head">
        <h1>Request Help</h1>
        <p className="muted">For questions and support that are not a campus problem, such as courses, exams, fees or your IT account. Fields marked * are required.</p>
      </header>

      {submittedId ? (
        <RequestSuccessCard id={submittedId} heading="Help request submitted" againLabel="Send another request" onAgain={reset} />
      ) : (
        <form className="card form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="title">Request title <span className="req" aria-hidden="true">*</span></label>
            <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Question about my timetable" maxLength={120} {...field('title')} />
            {err('title')}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="category">Help category <span className="req" aria-hidden="true">*</span></label>
              <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value)} {...field('category')}>
                <option value="">Select a category…</option>
                {HELP_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              {err('category')}
            </div>
            <div className="field">
              <label htmlFor="department">Relevant department <span className="muted small">(optional)</span></label>
              <input id="department" className="input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" maxLength={80} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="description">Description <span className="req" aria-hidden="true">*</span></label>
            <textarea id="description" className="input" rows={5} value={description} maxLength={MAX_DESC + 200} onChange={(e) => setDescription(e.target.value)} placeholder="What do you need help with? Add any details that will help us answer." {...field('description')} />
            <div className="field-meta">
              {err('description') || <span />}
              <span className="muted small">{description.trim().length}/{MAX_DESC}</span>
            </div>
          </div>

          <p className="muted small">File attachments are not supported in this prototype. Please describe your request in words.</p>

          {submitError && <div className="alert alert-error" role="alert"><Icon name="alert" size={18} /><span>{submitError}</span></div>}
          <div className="row form-actions">
            <button type="submit" className="btn btn-primary">Submit Request</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(base)}>Cancel</button>
          </div>
        </form>
      )}
    </>
  );
}
