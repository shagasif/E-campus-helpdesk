import { ComplaintForm } from '../components/ComplaintForm';

export function ReportIssuePage() {
  return (
    <>
      <header className="page-head">
        <h1>Report a Problem</h1>
        <p className="muted">Tell us what is wrong and where (equipment, buildings, facilities and other campus problems). Fields marked * are required.</p>
      </header>
      <ComplaintForm />
    </>
  );
}
