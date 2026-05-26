import { useState } from "react";
import { useAuth } from "../AuthContext";
import { useStore } from "../StoreContext";

type AuthMode = "signin" | "signup";

function syncLabel(status: string): string {
  switch (status) {
    case "loading":
      return "Loading from cloud…";
    case "syncing":
      return "Saving…";
    case "synced":
      return "Synced";
    case "error":
      return "Sync error";
    default:
      return "Local only";
  }
}

export default function SettingsPage() {
  const {
    user,
    loading: authLoading,
    isConfigured,
    signIn,
    signUp,
    signOut,
  } = useAuth();
  const { exportData, importData, syncStatus, syncError } = useStore();

  const [status, setStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showManualSync, setShowManualSync] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      if (authMode === "signin") {
        await signIn(email.trim(), password);
        setStatus("Signed in — your plan will sync automatically.");
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (needsConfirmation) {
          setStatus("Check your email to confirm, then sign in.");
        } else {
          setStatus("Account created — syncing now.");
        }
      }
      setPassword("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setStatus("Signed out. Data stays on this phone.");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportData());
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Could not copy.");
    }
  };

  const handleImport = () => {
    try {
      importData(importText);
      setImportText("");
      setStatus("Plan imported.");
    } catch {
      setStatus("Invalid data — check and try again.");
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Account</h1>
        <p className="page-lead">
          {user
            ? "Signed in — changes sync between phones"
            : "Sign in on both phones to stay in sync"}
        </p>
      </header>

      {status && (
        <div className="toast" role="status">
          {status}
        </div>
      )}

      {!isConfigured && (
        <section className="settings-section settings-warn">
          <h2>Cloud sync not set up yet</h2>
          <p>
            Add Supabase keys to a <code>.env</code> file (see README), run the
            SQL schema, then rebuild. Until then, use manual export below.
          </p>
        </section>
      )}

      {isConfigured && (
        <section className="settings-section">
          {user ? (
            <>
              <div className="account-row">
                <div>
                  <h2>Signed in</h2>
                  <p className="account-email">{user.email}</p>
                </div>
                <span className={`sync-badge sync-${syncStatus}`}>
                  {syncLabel(syncStatus)}
                </span>
              </div>
              {syncError && <p className="auth-error">{syncError}</p>}
              <p className="account-hint">
                Use the <strong>same email and password</strong> on your
                partner&apos;s phone. Updates sync automatically.
              </p>
              <button
                type="button"
                className="btn-secondary btn-full"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <h2>{authMode === "signin" ? "Sign in" : "Create account"}</h2>
              <p>
                Create one shared account for your household. Both of you sign
                in with the same credentials.
              </p>
              {authLoading ? (
                <p className="account-hint">Loading…</p>
              ) : (
                <form className="auth-form" onSubmit={handleAuth}>
                  <label>
                    Email
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      autoComplete={
                        authMode === "signin" ? "current-password" : "new-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </label>
                  {authError && <p className="auth-error">{authError}</p>}
                  <button
                    type="submit"
                    className="btn-primary btn-full"
                    disabled={authBusy}
                  >
                    {authBusy
                      ? "Please wait…"
                      : authMode === "signin"
                        ? "Sign in"
                        : "Create account"}
                  </button>
                </form>
              )}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setAuthMode(authMode === "signin" ? "signup" : "signin");
                  setAuthError(null);
                }}
              >
                {authMode === "signin"
                  ? "Need an account? Create one"
                  : "Already have an account? Sign in"}
              </button>
            </>
          )}
        </section>
      )}

      <section className="settings-section install-hint">
        <h2>Install on your phone</h2>
        <p>
          <strong>iPhone:</strong> Safari → Share → Add to Home Screen
        </p>
        <p>
          <strong>Android:</strong> Chrome → Install app / Add to Home Screen
        </p>
      </section>

      <button
        type="button"
        className="btn-ghost manual-sync-toggle"
        onClick={() => setShowManualSync(!showManualSync)}
      >
        {showManualSync ? "Hide" : "Show"} manual backup (no account)
      </button>

      {showManualSync && (
        <>
          <section className="settings-section">
            <h2>Export plan</h2>
            <div className="settings-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={copyToClipboard}
              >
                Copy to clipboard
              </button>
            </div>
          </section>

          <section className="settings-section">
            <h2>Import plan</h2>
            <textarea
              className="import-area"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"meals":[...],"assignments":[...]}'
              rows={5}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleImport}
              disabled={!importText.trim()}
            >
              Import plan
            </button>
          </section>
        </>
      )}
    </div>
  );
}
