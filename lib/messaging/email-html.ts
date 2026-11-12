const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Minimal, client-safe HTML email. Links are rewritten through our click tracker. */
export function buildEmailHtml(opts: { title: string; bodyText: string; ctaLabel?: string; ctaUrl?: string; trackClick: (url: string) => string; pixelUrl: string }) {
  const linkify = (t: string) => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${esc(opts.trackClick(u.replace(/&amp;/g, "&")))}" style="color:#2e1f3a;text-decoration:underline">${u}</a>`);
  const paragraphs = opts.bodyText.split(/\n{2,}/).map((p) => `<p style="margin:0 0 16px">${linkify(p).replace(/\n/g, "<br>")}</p>`).join("");
  const cta = opts.ctaUrl
    ? `<p style="text-align:center;margin:28px 0"><a href="${esc(opts.trackClick(opts.ctaUrl))}" style="background:#2e1f3a;color:#faf5ef;padding:13px 30px;border-radius:999px;text-decoration:none;font-weight:600">${esc(opts.ctaLabel ?? "RSVP now")}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#faf5ef;font-family:Figtree,Helvetica,Arial,sans-serif;color:#2e1f3a;line-height:1.55">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;padding:32px">
<tr><td><h1 style="font-family:'Bricolage Grotesque',Helvetica,Arial,sans-serif;font-weight:700;letter-spacing:-0.02em;text-align:center;margin:0 0 24px">${esc(opts.title)}</h1>${paragraphs}${cta}</td></tr>
</table>
<p style="margin:20px 0 0;font-size:12px;color:#7b6c7e">Sent with <span style="color:#2e1f3a;font-weight:600">celebra</span></p>
</td></tr></table><img src="${esc(opts.pixelUrl)}" width="1" height="1" alt="" style="display:none"></body></html>`;
}
