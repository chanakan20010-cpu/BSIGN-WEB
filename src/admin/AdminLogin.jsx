import React, { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, CircleHelp } from "lucide-react";
import { AdminBrand, useAdminIdentity } from "./AdminShell";
import {
  adminPresentationDefaults,
  renderAdminPresentationText,
  sanitizePublicAdminPresentation,
} from "../../server/admin-presentation-defaults";
import "./admin.css";
import "./admin-presentation.css";

const loginStatusFields = {
  INVALID_CREDENTIALS: "invalidCredentials",
  RATE_LIMIT: "rateLimited",
  RATE_LIMITED: "rateLimited",
  VALIDATION: "validationError",
  VALIDATION_ERROR: "validationError",
  UNAUTHORIZED: "sessionExpired",
  SESSION_EXPIRED: "sessionExpired",
  CSRF_FAILED: "sessionExpired",
  PASSWORD_CHANGED: "passwordChanged",
};

function statusField(status) {
  const message =
    typeof status === "string" ? status : status?.code || status?.message;
  if (typeof message !== "string" || !message) return null;
  if (loginStatusFields[message]) return loginStatusFields[message];
  for (const key of [
    "invalidCredentials",
    "rateLimited",
    "validationError",
    "sessionExpired",
    "genericError",
    "passwordChanged",
  ]) {
    if (message === adminPresentationDefaults[key]) return key;
  }
  if (message.startsWith("เปลี่ยนรหัสผ่านแล้ว")) return "passwordChanged";
  return null;
}

// The controller already translates API errors. Recognize those defaults as
// well as error codes so edited copy works without changing authentication.
export function translateLoginStatus(status, presentation, global) {
  const field = statusField(status);
  if (field) {
    return renderAdminPresentationText(
      sanitizePublicAdminPresentation(presentation)[field],
      global,
    );
  }
  return typeof status === "string"
    ? status
    : renderAdminPresentationText(
        sanitizePublicAdminPresentation(presentation).genericError,
        global,
      );
}

function AuthStory({ identity }) {
  const titleId = useId();
  return (
    <section className="cms-auth-story" aria-labelledby={titleId}>
      <div className="cms-login-brand">
        <AdminBrand
          global={identity.global}
          presentation={identity.presentation}
        />
      </div>
      <div className="cms-auth-story-copy">
        <p className="cms-eyebrow">{identity.text("storyEyebrow")}</p>
        <h1 id={titleId}>{identity.text("storyTitle")}</h1>
        <p className="cms-auth-intro">{identity.text("storyIntro")}</p>
        <div className="cms-login-rule" />
        <p className="cms-login-tagline">{identity.text("storyTagline")}</p>
      </div>
      <div className="cms-auth-story-footer">
        {identity.text("storyFooter")}
      </div>
    </section>
  );
}

export function AdminAuthFrame({
  title,
  description,
  children,
  login = false,
  preview = false,
  global,
  presentation,
}) {
  // Setup and recovery retain their own copy and their supplied headings.
  const identity = useAdminIdentity(
    global,
    login ? presentation : adminPresentationDefaults,
  );
  const actionTitleId = useId();
  const Frame = preview ? "div" : "main";
  return (
    <Frame lang="th" className="admin cms-auth">
      <div className="cms-auth-frame">
        <AuthStory identity={identity} />
        <section className="cms-auth-panel" aria-labelledby={actionTitleId}>
          <Link
            to="/"
            className="cms-auth-back"
            tabIndex={preview ? -1 : undefined}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {identity.text("backLabel")}
          </Link>
          <div className="cms-auth-form-wrap">
            <div className="cms-auth-heading">
              <AdminBrand
                compact
                global={identity.global}
                presentation={identity.presentation}
              />
              <p className="cms-auth-welcome">{identity.text("welcome")}</p>
              <h2 id={actionTitleId}>{title}</h2>
              <p className="cms-auth-description">{description}</p>
            </div>
            {children}
          </div>
          <p className="cms-auth-panel-footer">{identity.text("copyright")}</p>
        </section>
      </div>
    </Frame>
  );
}

export default function AdminLogin({
  busy,
  status,
  onSubmit,
  global,
  presentation,
  preview = false,
}) {
  const identity = useAdminIdentity(global, presentation);
  const [visible, setVisible] = useState(false),
    [caps, setCaps] = useState(false);
  const success = statusField(status) === "passwordChanged";
  return (
    <AdminAuthFrame
      login
      preview={preview}
      global={identity.global}
      presentation={identity.presentation}
      title={identity.text("title")}
      description={identity.text("description")}
    >
      <form onSubmit={onSubmit} aria-busy={busy}>
        <label>
          {identity.text("emailLabel")}
          <input
            type="email"
            name={preview ? undefined : "email"}
            autoComplete={preview ? "off" : "username"}
            required={!preview}
            maxLength={254}
            placeholder={identity.text("emailPlaceholder")}
          />
        </label>
        <label>
          {identity.text("passwordLabel")}
          <span className="cms-password-control">
            <input
              type={visible ? "text" : "password"}
              name={preview ? undefined : "password"}
              autoComplete={preview ? "off" : "current-password"}
              required={!preview}
              maxLength={200}
              placeholder={identity.text("passwordPlaceholder")}
              onKeyUp={(event) => setCaps(event.getModifierState("CapsLock"))}
            />
            <button
              type="button"
              className="cms-password-toggle"
              aria-label={identity.text(
                visible ? "hidePasswordLabel" : "showPasswordLabel",
              )}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? (
                <EyeOff size={19} aria-hidden="true" />
              ) : (
                <Eye size={19} aria-hidden="true" />
              )}
            </button>
          </span>
        </label>
        {caps && <p className="cms-caps-note">{identity.text("capsLock")}</p>}
        {status && (
          <p
            className="cms-status"
            data-tone={success ? "success" : "danger"}
            role={success ? "status" : "alert"}
          >
            {translateLoginStatus(
              status,
              identity.presentation,
              identity.global,
            )}
          </p>
        )}
        <button
          className="cms-primary cms-login-submit"
          disabled={busy}
          type="submit"
        >
          {busy && <span className="cms-button-spinner" aria-hidden="true" />}
          {identity.text(busy ? "pendingLabel" : "submitLabel")}
        </button>
      </form>
      <div className="cms-auth-note">
        <CircleHelp size={19} aria-hidden="true" />
        <div>
          <p>{identity.text("helpTitle")}</p>
          <details open={preview || undefined}>
            <summary>{identity.text("helpSummary")}</summary>
            <p>{identity.text("helpInstructions")}</p>
            <p>{identity.text("helpRecovery")}</p>
          </details>
        </div>
      </div>
    </AdminAuthFrame>
  );
}
