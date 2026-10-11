# Kirk–Evers document publication gate

The public Kirk–Evers page now reserves three document sections (bill text, plain-language summary and supporting documents). Until an approved publication edition exists, every slot states **Awaiting approved file** and provides **no download**. This is preferable to broken links, invented text or unreviewed historical files.

## Source and preparation

1. Confirm the **correct, approved publication version** of each document with the campaign editor and a different reviewing person. This workflow does not confer authorization or substitute for legal review.
2. Add the exact immutable public asset under `apps/web/public/documents/`, using filename `kirk-evers-<slug>-v<revision>.pdf`, `.txt` or a safe HTML build emitted by the vetted document renderer. PDFs should be text-selectable, tagged for reading order where feasible, and accompanied by accessible HTML/text if possible.
3. Compute SHA-256 of the final, reviewed bytes and update only the corresponding `content/public/site.json` `issues["kirk-evers"].documents` records. Use this exact record schema:

```json
{
  "id": "kirk-evers-bill-1",
  "kind": "bill",
  "label": "Reviewed Kirk–Evers Bill",
  "description": "Publication version, revision 1",
  "path": "/documents/kirk-evers-bill-v1.pdf",
  "status": "published",
  "revision": 1,
  "author": "verified_editor_identifier",
  "sha256": "INSERT_ACTUAL_64_CHARACTER_HEX_SHA256",
  "review": {
    "approvedBy": "different_verified_reviewer_identifier",
    "revision": 1,
    "at": "INSERT_REAL_ISO_DATETIME"
  }
}
```

The example is **not** an approved file or a publishing request. Use real reviewer identifiers/date/hash, backed by editorial and legal approval. A submitted draft may use `status: "draft"` and must not be linked. The schema accepts kinds `bill`, `summary`, and `supporting`. Published documents with missing assets, mismatched SHA-256, self-review, wrong revision, duplicate paths or disallowed filenames make builds fail.

## Safe HTML

Never upload arbitrary HTML to a public document path. Only generator-produced HTML bearing `g28-safe-document-v1`, a restrictive CSP and a reviewed byte hash is eligible. The campaign should add accessible standalone HTML along with source PDF/Markdown. No JavaScript, embedded forms, iframes, SVG or active third-party content is allowed.

## Release

Review PR changes, obtain nontechnical/legal approval, check the rendered page and downloads in all browsers, and only then merge/publish the content. The campaign page always labels Kirk–Evers a **proposal, not current federal law**. The existence of a document link does not mean the bill has been introduced or enacted.
