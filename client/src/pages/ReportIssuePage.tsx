import { ComplaintForm } from '../components/ComplaintForm';

export function ReportIssuePage() {
  return (
    <>
      <header className="page-head">
        <h1>Report an Issue</h1>
        <p className="muted">Tell us what is wrong and where. Fields marked * are required.</p>
      </header>
      <ComplaintForm />
    </>
  );
}
