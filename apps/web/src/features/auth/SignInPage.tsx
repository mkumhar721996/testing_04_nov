import { useState, type FormEvent } from 'react';
import { login } from '../../api/auth';
import { useSession } from './SessionProvider';

type Failure = 'invalid' | 'error' | null;

export function SignInPage() {
  const { notice, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);

  const emailError = submitted && !email.trim() ? 'Enter your email address.' : null;
  const passwordError = submitted && !password ? 'Enter your password.' : null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFailure(null);
    if (!email.trim() || !password) return;
    setBusy(true);
    const result = await login(email.trim(), password);
    setBusy(false);
    if (result.kind === 'ok') signIn(result.session);
    else setFailure(result.kind);
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card stack">
        <h1 className="text-lg">Sign in</h1>
        <div className="auth-notice" aria-live="polite">
          {busy && (
            <div className="cluster">
              <span className="spinner" aria-hidden="true" />
              <span>Signing you in…</span>
            </div>
          )}
          {!busy && failure && (
            <div className="alert alert-danger" role="alert">
              {failure === 'invalid'
                ? 'The email or password is incorrect. Check both and try again.'
                : "We couldn't sign you in. Try again in a moment."}
            </div>
          )}
          {!busy && !failure && notice === 'expired' && (
            <div className="alert alert-warning" role="alert">
              Your session expired. Sign in again to continue.
            </div>
          )}
          {!busy && !failure && notice === 'signed-out' && (
            <div className="alert alert-success" role="status">
              You signed out.
            </div>
          )}
        </div>
        <form className="stack" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="signin-email">Email</label>
            <input
              id="signin-email"
              className={emailError ? 'input is-invalid' : 'input'}
              type="email"
              placeholder="Email"
              autoComplete="username"
              aria-describedby="signin-email-err"
              aria-invalid={emailError ? true : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {emailError && (
              <span className="field-error" id="signin-email-err" role="alert">
                {emailError}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="signin-password">Password</label>
            <input
              id="signin-password"
              className={passwordError ? 'input is-invalid' : 'input'}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              aria-describedby="signin-password-err"
              aria-invalid={passwordError ? true : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {passwordError && (
              <span className="field-error" id="signin-password-err" role="alert">
                {passwordError}
              </span>
            )}
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
