import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationType, applicationTypesFor, type FormField } from '../utils/requestConfig';
import { useRequests } from '../context/RequestsContext';
import { displayName, useAuth, useBase } from '../context/AuthContext';
import { USER_TYPE_LABELS } from '../utils/accounts';
import { RequestSuccessCard } from '../components/RequestSuccessCard';
import { Icon } from '../components/Icon';

type Values = Record<string, string>;

/** Formal applications and service requests. The form changes with the application type. */
export function ApplicationsPage() {
  const { addRequest } = useRequests();
  const { session } = useAuth();
  const base = useBase();
  const navigate = useNavigate();
  const userType = session?.userType;
  const types = useMemo(() => applicationTypesFor(userType), [userType]);
  const [typeKey, setTypeKey] = useState('');
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Values>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const busy = useRef(false);
  const type = typeKey ? applicationType(typeKey) : undefined;

  function chooseType(key: string) {
    setTypeKey(key);
    setValues({});
    setErrors({});
    setSubmitError(null);
  }

  function validate(fields: FormField[]): Values {
    const next: Values = {};
    for (const f of fields) {
      const v = (values[f.key] ?? '').trim();
      if (!v) {
        if (f.required) next[f.key] = f.type === 'select' ? `Please choose: ${f.label.toLowerCase()}.` : `Please fill in: ${f.label.toLowerCase()}.`;
        continue;
      }
      if (f.minLength && v.length < f.minLength) next[f.key] = `Please give a little more detail (at least ${f.minLength} characters).`;
      else if (f.maxLength && v.length > f.maxLength) next[f.key] = `Please keep this under ${f.maxLength} characters.`;
    }
    const start = (values.startDate ?? '').trim();
    const end = (values.endDate ?? '').trim();
    if (start && end && end < start) next.endDate = 'The end date cannot be before the start date.';
    return next;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy.current || !session || !type) return;
    setSubmitError(null);
    const next = validate(type.fields);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    busy.current = true;
    try {
      const details: Values = {};
      for (const f of type.fields) { const v = (values[f.key] ?? '').trim(); if (v) details[f.key] = v; }
      const longText = type.fields.find((f) => f.type === 'textarea');
      const dates = details.startDate && details.endDate ? ` (${details.startDate} to ${details.endDate})` : '';
      const r = addRequest({
        kind: 'application',
        title: `${type.label}${dates}`,
        category: type.key,
        department: session.department,
        description: (longText && details[longText.key]) || type.label,
        details,
        submittedBy: session.id.toLowerCase(), submitterName: session.name, submitterType: session.userType,
      });
      setSubmittedId(r.id);
    } catch {
      setSubmitError('Something went wrong while saving your application. Please try again.');
    } finally {
      busy.current = false;
    }
  }

  function reset() {
    setTypeKey(''); setValues({}); setErrors({}); setSubmittedId(null);
  }

  function renderField(f: FormField) {
    const id = `f-${f.key}`;
    const common = {
      id,
      className: 'input',
      value: values[f.key] ?? '',
      'aria-invalid': !!errors[f.key],
      'aria-describedby': errors[f.key] ? `${id}-err` : undefined,
    };
    const set = (v: string) => setValues((prev) => ({ ...prev, [f.key]: v }));
    return (
      <div className="field" key={f.key}>
        <label htmlFor={id}>{f.label} {f.required ? <span className="req" aria-hidden="true">*</span> : <span className="muted small">(optional)</span>}</label>
        {f.type === 'select' ? (
          <select {...common} onChange={(e) => set(e.target.value)}>
            <option value="">Select…</option>
            {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : f.type === 'textarea' ? (
          <textarea {...common} rows={4} maxLength={(f.maxLength ?? 1000) + 200} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} />
        ) : (
          <input {...common} type={f.type === 'date' ? 'date' : 'text'} maxLength={f.type === 'date' ? undefined : f.maxLength} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} />
        )}
        {errors[f.key] && <p id={`${id}-err`} className="field-error" role="alert">{errors[f.key]}</p>}
      </div>
    );
  }

  return (
    <>
      <header className="page-head">
        <h1>Applications &amp; Services</h1>
        <p className="muted">Formal applications such as leave, certificates, ID cards and access. Fields marked * are required.</p>
      </header>

      {submittedId ? (
        <RequestSuccessCard id={submittedId} heading="Application submitted" againLabel="Send another application" onAgain={reset} />
      ) : (
        <form className="card form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="app-type">Application type <span className="req" aria-hidden="true">*</span></label>
            <select id="app-type" className="input" value={typeKey} onChange={(e) => chooseType(e.target.value)}>
              <option value="">Select an application type…</option>
              {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          {!type ? (
            <p className="muted small">Choose an application type to see its form.</p>
          ) : (
            <>
              <div className="alert alert-info" role="note"><Icon name="note" size={18} /><span>{type.hint} Applications are not approved automatically.</span></div>

              <section className="applicant-box" aria-label="Applicant details">
                <h2>Applicant</h2>
                <dl className="info-grid">
                  <div><dt>Name</dt><dd>{displayName(session)}</dd></div>
                  <div><dt>Email</dt><dd>{session?.id}</dd></div>
                  <div><dt>Role</dt><dd>{userType ? USER_TYPE_LABELS[userType] : 'Not set'}</dd></div>
                  <div><dt>Department</dt><dd>{session?.department ?? 'Not set'}</dd></div>
                </dl>
                <p className="muted small">Taken from your profile. You can change them on the Profile page.</p>
              </section>

              {type.fields.map(renderField)}
              <p className="muted small">Supporting documents cannot be uploaded in this prototype. Mention what you can provide in the details.</p>

              {submitError && <div className="alert alert-error" role="alert"><Icon name="alert" size={18} /><span>{submitError}</span></div>}
              <div className="row form-actions">
                <button type="submit" className="btn btn-primary">Submit Application</button>
                <button type="button" className="btn btn-secondary" onClick={() => navigate(base)}>Cancel</button>
              </div>
            </>
          )}
        </form>
      )}
    </>
  );
}
