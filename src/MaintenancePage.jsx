import React from "react";
import { useSite } from "./shared";
import "./maintenance-page.css";

export default function MaintenancePage() {
  const { content, lang, setLang, t } = useSite();
  const maintenance = content.maintenance;
  return (
    <main className="maintenance-page" id="main" tabIndex={-1}>
      <div className="maintenance-page-top">
        <strong className="maintenance-page-brand type-brand">
          {t(content.global.brand)}
        </strong>
        <div
          className="maintenance-page-languages"
          role="group"
          aria-label={lang === "th" ? "เลือกภาษา" : "Choose language"}
        >
          {[
            ["th", "TH"],
            ["en", "EN"],
          ].map(([key, label]) => (
            <button
              key={key}
              className="type-menu"
              lang={key}
              aria-pressed={lang === key}
              onClick={() => setLang(key)}
            >
              {content.global.languages?.[key] || label}
            </button>
          ))}
        </div>
      </div>
      <section
        className="maintenance-page-content"
        aria-labelledby="maintenance-page-title"
      >
        <span className="maintenance-page-accent" aria-hidden="true" />
        <h1 className="type-hero" id="maintenance-page-title">
          {t(maintenance.title)}
        </h1>
        <p className="type-body">{t(maintenance.message)}</p>
      </section>
    </main>
  );
}
