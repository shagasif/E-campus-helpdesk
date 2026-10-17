import { useState } from 'react';
import { Icon } from './Icon';
import { requestSummary, SUMMARY_MAX, SUMMARY_MIN } from '../utils/api';

interface Props {
  description: string;
  onUse: (summary: string) => void;
  useLabel: string;
}

/** "Generate AI Summary" button + review area. The original text is never changed. */
export function AiSummaryBox({ description, onUse, useLabel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const length = description.trim().length;
  const tooShort = length < SUMMARY_MIN;
  const tooLong = length > SUMMARY_MAX;

  async function generate() {
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      setSuggestion(await requestSummary(description.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-box">
      <div className="ai-head">
        <button type="button" className="btn btn-secondary" onClick={generate} disabled={loading || tooShort || tooLong}>
          <Icon name="sparkle" size={16} /> {loading ? 'Generating…' : 'Generate AI Summary'}
        </button>
        <span className="muted small">Optional. Uses Gemini through the local backend.</span>
      </div>
      {tooShort && <p className="muted small">Write at least {SUMMARY_MIN} characters of description to enable this.</p>}
      {tooLong && <p className="field-error">The description is longer than {SUMMARY_MAX} characters, so it cannot be summarized.</p>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {suggestion && (
        <div className="ai-result" aria-live="polite">
          <div className="ai-label">AI-suggested summary (not verified)</div>
          <p>{suggestion}</p>
          <div className="row">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { onUse(suggestion); setSuggestion(null); }}>
              {useLabel}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSuggestion(null)}>Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}
