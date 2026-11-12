const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Minimal, client-safe HTML email. Links are rewritten through our click tracker. */
export function buildEmailHtml(opts: { title: string; bodyText: string; ctaLabel?: string; ctaUrl?: string; trackClick: (url: string) => string; pixelUrl: string }) {
  const linkify = (t: string) => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${esc(opts.trackClick(u.replace(/&amp;/g, "&")))}" style="color:#a67c52">${u}</a>`);
  const paragraphs = opts.bodyText.split(/\n{2,}/).map((p) => `<p style="margin:0 0 16px">${linkify(p).replace(/\n/g, "<br>")}</p>`).join("");
  const cta = opts.ctaUrl
    ? `<p style="text-align:center;margin:28px 0"><a href="${esc(opts.trackClick(opts.ctaUrl))}" style="background:#a67c52;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600">${esc(opts.ctaLabel ?? "Confirmar asistencia")}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f6f2ec;font-family:Georgia,serif;color:#3b3530">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;padding:32px">
<tr><td><h1 style="font-weight:normal;text-align:center;margin:0 0 24px">${esc(opts.title)}</h1>${paragraphs}${cta}</td></tr>
</table></td></tr></table><img src="${esc(opts.pixelUrl)}" width="1" height="1" alt="" style="display:none"></body></html>`;
}
