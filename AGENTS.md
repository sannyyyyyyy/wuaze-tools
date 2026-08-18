# AGENTS.md — Wuaze Tools

Non-obvious facts about this project that cannot be recovered by reading the code. Kept terse.

## Deployment

- Live site `toolss.wuaze.com` runs **InfinityFree (PHP) hosting**. `proxy.php` MUST sit in the same folder as `index.html` — it was missing (404) on the live site for weeks and is the #1 cause of account-creator failures ("Proxy erişilemez" / dead mail.tm path).
- Vercel fallback exists in `deploy/`: static SPA (`framework: null`) + serverless proxy `api/mailtm.js`, routed by `vercel.json`. `deploy/index.html` is a placeholder, not the real app — copy the working `index.html` there before a Vercel deploy.
- The sandbox's egress IP is hard-blocked by BOTH the forum and the site host (InfinityFree closes connections abruptly; the site serves a JS challenge). Inspect the live site via the r.jina.ai reader proxy or the user's own browser.
- Public CORS proxies (allorigins.win, corsproxy.io) time out or return empty from this network — don't rely on them.

## Forum API (forumapi.sinavla.com)

- `POST /user/sendEmailCode` is **per-IP rate limited** ("Çok fazla istek gönderdiniz" + `Retry-After` header). Probing it repeatedly from one IP earns a multi-hour hard block (~16 h observed on the sandbox IP). `registerWithEmail` and `codeLogin` are NOT rate limited — safe to probe with fake codes (they answer "Onay kodu hatalı" / "Kod hatalı.").
- `codeLogin` returns `{"status":"data","data":"not_found"}` for invalid codes — treat as failure (a past bug saved empty-uid accounts from this).
- `sendEmailCode` rejects known disposable domains with "Bu e-posta sağlayıcısı desteklenmiyor" (guerrillamail, maildrop → rejected). `emalupe.com` (mail.tm's current only domain) is accepted.
- sinavla.com sends outbound mail via **Yandex** (SPF `redirect=_spf.yandex.net`); Yandex blocks known temp-mail domains, so codes never arrive at guerrillamail/maildrop — only mail.tm domains deliver.

## Mail.tm (api.mail.tm)

- api.mail.tm sends **no CORS headers at all** — the browser can never call it directly; a same-origin proxy (proxy.php or `api/mailtm`) is mandatory.
- mail.tm **rotates its domain list** (it can return several domains at some times, only one at others). The bot pins `emalupe.com` deliberately because the forum accepts it; random domain pick caused "sağlayıcı desteklenmiyor" failures.
- Message `intro` is only the first ~200 chars — fetch `/messages/{id}` full body (text + html) to reliably extract codes.

## index.html internals

- `extractCode` historically returned garbage with `/i` flag on `[A-Z0-9]{4,8}`: "Doğrulama kodunuz: 482913" yielded "unuz". Label patterns must capture **digits only**.
- JS reaches many element IDs by string; the "Gruba Katıl" page had 4 referenced-but-missing IDs (`gjThreadId`, `gjToken`, `gjGid_TEMP`, `gjParsedInfo`) causing silent TypeErrors. After touching any page, run a scan: every `getElementById('x')` in the script must exist in the HTML.
- Bot-engine logic (run/stop/stats/phases) is duplicated across 5 tools (`toggleVB/FB/FS/AC/IN`, `runNewAccounts*`, `finish*`); behavior has drifted between copies. Fixes must be applied per-tool or unified (see architecture review: candidate "BotRun" module).
- Forum sustainable rate is ~1 code / 10–12 s (~20 codes / 3–4 min). The bot clamps the user's "Kod Aralığı" to ≥10 s. Cloudflare **WARP shared egress IPs** (104.28.x.x) get blocked by the forum very fast — recommend mobile data / residential VPN for reliable runs.
- The file ends with an optimized patch block whose later function definitions override earlier duplicates — when editing, later definitions win.

## Testing index.html in Node (harness gotchas)

- The whole app is one function scope. To unit test: extract `<script>` content, stub `document`/`window`/`localStorage`/`fetch`, then evaluate via `new Function(src + ';return {…internals…}')`.
- `slp()` uses a **Web Worker** for timers; in Node ≥20 `Worker` is a global, so real delays apply (waitCode's 75 s MAIL_TIMEOUT hangs tests). Stub `global.Worker` to throw so slp falls back to setTimeout. Capture the original setTimeout BEFORE overriding it.
- `hashPw` requires `global.dcodeIO.bcrypt` to be stubbed.
- Harness timers must actually fire (clamp to a few ms), or promise chains hang silently.

## Environment quirks

- `preview_screenshot` fails in this environment ("webContents not attached" / "no frames") — verify UI with `preview_snapshot` (accessibility tree) and `preview_evaluate` (getComputedStyle) instead.
- The workspace is **not a git repository** (no `.git`); git commands fail with "not a git repository". The stray `.gitignore` is a leftover template from another project.
- No `CONTEXT.md`, no `docs/adr/` — architecture vocabulary (module, seam, leverage) comes only from the improve-codebase-architecture skill.
