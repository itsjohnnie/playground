"use client";

import { useState, type FormEvent } from "react";

// Where the form posts. Defaults to a same-origin Worker route (works on the
// Cloudflare deployment). Override with NEXT_PUBLIC_CONTACT_ENDPOINT if needed.
const ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT || "/api/contact";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

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
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="ui-form">
      {status !== "success" && (
        <form
          name="email-form"
          className="form-block"
          onSubmit={handleSubmit}
          noValidate
        >
          <div id="ui-node-_6829feba-1507-2144-b2d5-9bf30f1d60ab-88754749">
            <label htmlFor="First-name" className="form_label">First name</label>
            <input className="input ui-input" maxLength={256} name="First-name" data-name="First name" placeholder="Michael" type="text" id="First-name" />
          </div>
          <div id="ui-node-_3358f559-ab27-daca-3ff4-566ef882069a-88754749">
            <label htmlFor="Last-name" className="form_label">Last name</label>
            <input className="input ui-input" maxLength={256} name="Last-name" data-name="Last name" placeholder="Scott" type="text" id="Last-name" />
          </div>
          <div id="ui-node-_6c0fe243-60c4-4a3a-2b26-33bac757c5bd-88754749">
            <label htmlFor="email" className="form_label">Email</label>
            <input className="input ui-input" maxLength={256} name="email" data-name="Email" placeholder="michael.g.scott@sabre.net" type="email" id="email" required />
          </div>
          <div id="ui-node-_0619b491-c351-eb3e-25fb-cc6c49253414-88754749">
            <label htmlFor="Why" className="form_label">Subject</label>
            <input className="input ui-input" maxLength={256} name="Why" data-name="Why" placeholder="Jamaica Jan photo" type="text" id="Why" />
          </div>
          <div id="ui-node-_7f5a8fc1-66a3-3f08-a351-fce4efbaf9da-88754749">
            <label htmlFor="Message" className="form_label">Message</label>
            <textarea placeholder="Write your message here. No worries if it&#x27;s short and sweet. " maxLength={5000} id="Message" name="Message" data-name="Message" className="input cc-textearea ui-input"></textarea>
          </div>
          {/* Honeypot: visually hidden, off the tab order, ignored by humans. */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="Company">Company</label>
            <input type="text" id="Company" name="company" tabIndex={-1} autoComplete="off" />
          </div>
          <input
            type="submit"
            id="ui-node-b67203ee-7bb7-116a-5a4c-5e6567b72e26-88754749"
            className="button form ui-button"
            value={status === "sending" ? "Sending to packaging@dundermifflin.com" : "Send message"}
            disabled={status === "sending"}
          />
        </form>
      )}
      {status === "success" && (
        <div className="form-success ui-form-done" style={{ display: "block" }}>
          <div className="text-block-4">Thank you! Your submission has been received!</div>
        </div>
      )}
      {status === "error" && (
        <div className="ui-form-fail" style={{ display: "block" }}>
          <div>Oops! Something went wrong while submitting the form.</div>
        </div>
      )}
    </div>
  );
}
