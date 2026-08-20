import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';

/**
 * A failed login is not always bad credentials: a misconfigured API URL, a
 * CORS rejection or a sleeping backend all land here too. Reporting every
 * one of them as "invalid password" sends people hunting the wrong problem.
 */
function describeLoginFailure(err: unknown): string {
  const e = err as { response?: { status?: number } };
  const status = e?.response?.status;

  if (status === 401 || status === 422) return "Invalid email or password.";
  if (status === 404) return "API not found at that address. Check VITE_API_URL ends with /api/v1.";
  if (status && status >= 500) return "The server failed. It may be starting up, or unable to reach its database.";
  if (!e?.response) return "Cannot reach the API. It may be asleep (the first request can take ~50s), or this origin is not in the API's allowed list.";
  return "Login failed (HTTP " + status + ").";
}

export default function LoginPage() {
  const [email, setEmail] = useState('s.jenkins@lexpatent-ip.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/board');
    } catch (err) {
      setError(describeLoginFailure(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
      <div className="tc-card w-full max-w-md relative z-10">
        <div className="card-body gap-6 p-6 sm:p-8">
          <div className="text-center text-ink">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary text-primary-content grid place-items-center"><Icon name="gavel" size={28} filled /></div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wide">LexPatent Docket Radar</h1>
            <p className="text-sm opacity-70 mt-1">Zero-fail patent prosecution & deadline management</p>
          </div>

          {error && (
            <div role="alert" className="alert alert-error border border-rule">
              <Icon name="error" size={18} filled />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-ink">
            <fieldset className="fieldset">
              <legend className="fieldset-legend font-bold uppercase text-xs">Email</legend>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input input-bordered tc-input w-full" required />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend font-bold uppercase text-xs">Password</legend>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input input-bordered tc-input w-full" required />
            </fieldset>
            <button
              type="submit"
              className="btn w-full tc-btn-primary tc-btn"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner" /> : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-center opacity-60 font-semibold text-ink">
            Demo: s.jenkins@lexpatent-ip.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}
