// dancapitandeplai-mailer: sends the admin login emails for the Pages site.
// Reached only through the Pages project's MAILER service binding (no public route).
// Binding SEND (send_email) only allows the verified admin addresses as recipients.
import { EmailMessage } from "cloudflare:email";

// FROM must be on a zone with Email Routing on. Var FROM on the Worker overrides:
// noreply@payloopy.com until dancapitandeplai.ro is active, then admin@dancapitandeplai.ro.
const DEFAULT_FROM = "admin@dancapitandeplai.ro";
const FROM_NAME = "Dan Căpitan de Plai";

const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const header = s => `=?UTF-8?B?${b64(s)}?=`;

export default {
  async fetch(req, env) {
    if (req.method !== "POST") return new Response("no", { status: 405 });
    const FROM = env.FROM || DEFAULT_FROM;
    const { to, subject, text } = await req.json();
    if (!/^[^\s@<>]+@[^\s@<>]+$/.test(String(to || ""))) return new Response("bad to", { status: 400 });
    const raw = [
      `From: ${header(FROM_NAME)} <${FROM}>`,
      `To: <${to}>`,
      `Subject: ${header(String(subject || ""))}`,
      `Message-ID: <${crypto.randomUUID()}@${FROM.split("@")[1]}>`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(String(text || "")).replace(/.{1,76}/g, "$&\r\n"),
    ].join("\r\n");
    try {
      await env.SEND.send(new EmailMessage(FROM, to, raw));
      return new Response("ok");
    } catch (e) {
      return new Response("send failed: " + e.message, { status: 502 });
    }
  },
};
