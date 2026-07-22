# Secure verified-PDF delivery

Verified source PDFs use an authenticated same-origin proxy. R2 object keys, R2 credentials, and presigned source URLs are never returned to the browser.

The browser first creates a short-lived read session for a specific owned project asset and operation. The opaque token is sent in `X-Storage-Read-Token`, not in the URL. Access also requires the owner's normal authenticated session. Tokens are stored only as SHA-256 hashes, expire after ten idle minutes, have an eight-hour absolute lifetime, and can be revoked.

The content route supports one RFC-style byte range at a time, verifies the returned R2 range metadata, and streams bytes without assembling the PDF in server memory. PDF.js uses 4 MiB lazy ranges and does not automatically fetch the entire document. This is intended for large construction drawings and 200+ page files.

View responses use private one-minute browser caching and vary by authentication, token, and range. Downloads use `no-store`. Trashed projects, superseded assets, non-ready objects, expired sessions, wrong users, and wrong tokens all receive the same generic not-found response.

The private source bucket requires no browser CORS policy because only the application server reads it. Keep public access and public/custom domains disabled. Its worker/server credential should have only the source-object permissions required by the deployed runtime.

The v2 route remains disabled while `STORAGE_MODEL_V2_ENABLED=false`; the legacy Studio route is unchanged until isolated infrastructure tests pass.

## Studio large-document behavior

When storage v2 is enabled and a verified source exists, Studio requests a project-bound read session and gives PDF.js the authenticated same-origin range source. The project API suppresses the legacy presigned PDF URL in that state. Legacy delivery remains available only while v2 is disabled or before a verified v2 source exists.

Preview canvases have hard pixel and edge limits, including oversized architectural sheets. For documents above 80 pages, Studio retains only visible, nearby, and active-neighbor full previews, keeps a bounded thumbnail window, cancels stale PDF.js render tasks, and destroys document/read-session resources on retry, project change, and unmount.

Secure uploads are selected only when the server explicitly reports storage v2 enabled. Failures do not downgrade to the legacy upload path. Uploads hash incrementally, use bounded multipart concurrency, enter quarantine, and become readable only after the inspection worker marks the source ready.
