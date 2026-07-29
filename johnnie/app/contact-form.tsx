"use client";

import { useRef, useState, type FormEvent } from "react";

// Where the form posts. Defaults to a same-origin Worker route (works on the
// Cloudflare deployment). Override with NEXT_PUBLIC_CONTACT_ENDPOINT if needed.
const ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT || "/api/contact";

type Status = "idle" | "sending" | "success" | "error";

const SENDING_LABEL = "Sending to packaging@dundermifflin.com";

// The worker only requires email + message (name and subject are optional),
// so client validation matches that exactly.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  const email = String(data.get("email") || "").trim();
  const message = String(data.get("Message") || "").trim();
  if (!email) errors["email"] = "You forgot your email — how would I reply?";
  else if (!EMAIL_RE.test(email))
    errors["email"] = "That doesn't look like an email — typo somewhere?";
  if (!message) errors["Message"] = "You forgot the message — the best part!";
  return errors;
}

// Always mounted so the message can grow into place (and collapse away)
// smoothly instead of popping in. The last message is kept around while the
// slot collapses so the text doesn't vanish mid-animation.
function FieldError({ id, message }: { id: string; message?: string }) {
  const last = useRef("");
  if (message) last.current = message;
  return (
    <div className={`field-error${message ? " is-open" : ""}`} id={id} aria-hidden={message ? undefined : true}>
      <div className="field-error_clip">
        <div className="field-error_text">{message || last.current}</div>
      </div>
    </div>
  );
}

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  // What the button says while in the error state (rendered uppercase by the
  // button's own styles, matching "Send message").
  const [errorLabel, setErrorLabel] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Freeze the button at its resting width while sending so the marquee scrolls
  // inside it instead of stretching the button to the full text.
  const [btnWidth, setBtnWidth] = useState<number | null>(null);

  function fail(label: string) {
    setErrorLabel(label);
    setStatus("error");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot — bots fill this hidden field; humans never see it.
    if (String(data.get("company") || "").trim()) {
      setStatus("success");
      form.reset();
      return;
    }

    // Validate before ever showing the sending state, so a missed field gets
    // an immediate, specific answer instead of a fake round-trip.
    const errors = validate(data);
    setFieldErrors(errors);
    const names = Object.keys(errors);
    if (names.length > 0) {
      fail(
        names.length > 1
          ? "Oops — check the highlighted fields"
          : "Oops — check the highlighted field"
      );
      const first = form.elements.namedItem(names[0]);
      if (first instanceof HTMLElement) first.focus();
      return;
    }

    const btn = form.querySelector<HTMLElement>('button[type="submit"]');
    setBtnWidth(btn ? btn.offsetWidth : null);
    setStatus("sending");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.get("First-name"),
          lastName: data.get("Last-name"),
          email: data.get("email"),
          subject: data.get("Why"),
          message: data.get("Message"),
        }),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else if (res.status === 422) {
        fail("Oops — check the highlighted fields");
      } else {
        fail("Server hiccup — tap to retry");
      }
    } catch {
      fail(
        typeof navigator !== "undefined" && navigator.onLine === false
          ? "You're offline — tap to retry"
          : "Can't reach the server — tap to retry"
      );
    }
  }

  // Typing anywhere arms the button again; fixing a flagged field clears its
  // highlight as soon as the visitor starts addressing it.
  function handleInput(e: FormEvent<HTMLFormElement>) {
    setStatus((s) => (s === "error" ? "idle" : s));
    const target = e.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const name = target.name;
      setFieldErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function fieldProps(name: string) {
    const error = fieldErrors[name];
    return {
      className: `input ui-input${error ? " is-invalid" : ""}`,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${name}-field-error` : undefined,
    };
  }

  function fieldError(name: string) {
    return <FieldError id={`${name}-field-error`} message={fieldErrors[name]} />;
  }

  return (
    <div className="ui-form">
      {status !== "success" && (
        <form
          name="email-form"
          className="form-block"
          onSubmit={handleSubmit}
          onInput={handleInput}
          noValidate
        >
          <div id="ui-node-_6829feba-1507-2144-b2d5-9bf30f1d60ab-88754749">
            <label htmlFor="First-name" className="form_label">First name</label>
            <input {...fieldProps("First-name")} maxLength={256} name="First-name" data-name="First name" placeholder="Michael" type="text" id="First-name" />
            {fieldError("First-name")}
          </div>
          <div id="ui-node-_3358f559-ab27-daca-3ff4-566ef882069a-88754749">
            <label htmlFor="Last-name" className="form_label">Last name</label>
            <input {...fieldProps("Last-name")} maxLength={256} name="Last-name" data-name="Last name" placeholder="Scott" type="text" id="Last-name" />
            {fieldError("Last-name")}
          </div>
          <div id="ui-node-_6c0fe243-60c4-4a3a-2b26-33bac757c5bd-88754749">
            <label htmlFor="email" className="form_label">Email</label>
            <input {...fieldProps("email")} maxLength={256} name="email" data-name="Email" placeholder="michael.g.scott@sabre.net" type="email" id="email" required />
            {fieldError("email")}
          </div>
          <div id="ui-node-_0619b491-c351-eb3e-25fb-cc6c49253414-88754749">
            <label htmlFor="Why" className="form_label">Subject</label>
            <input {...fieldProps("Why")} maxLength={256} name="Why" data-name="Why" placeholder="Jamaica Jan photo" type="text" id="Why" />
            {fieldError("Why")}
          </div>
          <div id="ui-node-_7f5a8fc1-66a3-3f08-a351-fce4efbaf9da-88754749">
            <label htmlFor="Message" className="form_label">Message</label>
            <textarea placeholder="Write your message here. No worries if it&#x27;s short and sweet. " maxLength={5000} id="Message" name="Message" data-name="Message" className={`input cc-textearea ui-input${fieldErrors["Message"] ? " is-invalid" : ""}`} aria-invalid={fieldErrors["Message"] ? true : undefined} aria-describedby={fieldErrors["Message"] ? "Message-field-error" : undefined} required></textarea>
            {fieldError("Message")}
          </div>
          {/* Honeypot: visually hidden, off the tab order, ignored by humans. */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="Company">Company</label>
            <input type="text" id="Company" name="company" tabIndex={-1} autoComplete="off" />
          </div>
          <button
            type="submit"
            id="ui-node-b67203ee-7bb7-116a-5a4c-5e6567b72e26-88754749"
            className={`button form ui-button${status === "sending" ? " is-sending" : ""}${status === "error" ? " is-error" : ""}`}
            style={status === "sending" && btnWidth ? { width: btnWidth } : undefined}
            disabled={status === "sending"}
            aria-label={status === "sending" ? "Sending your message" : undefined}
          >
            {status === "sending" ? (
              <span className="send-marquee" aria-hidden="true">
                <span>{SENDING_LABEL}&nbsp;&nbsp;·&nbsp;&nbsp;</span>
                <span>{SENDING_LABEL}&nbsp;&nbsp;·&nbsp;&nbsp;</span>
              </span>
            ) : status === "error" ? (
              // Keyed so a new message re-runs the populate-in animation.
              <span className="btn-label" role="alert" key={errorLabel}>{errorLabel}</span>
            ) : (
              <span className="btn-label" key="idle">Send message</span>
            )}
          </button>
        </form>
      )}
      {status === "success" && (
        <div role="status" className="form-success ui-form-done" style={{ display: "block" }}>
          <div className="text-block-4">¡Gracias! Your message landed in my inbox — I&#x27;ll get back to you soon. 🙌</div>
        </div>
      )}
    </div>
  );
}
