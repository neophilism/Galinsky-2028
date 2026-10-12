# Live policy sources (owner authorized, 2026-10-12)

The owner confirms that policy documents under the designated GitHub locations are the authoritative originals; editing/replacing them should update campaign visitors' download view without copying files into the campaign repo. The target domain `galinsky2028.us` is NOT under campaign control yet. Continue serving the two existing private Render services within Phillip's workspace; do not create new services.

## Exact source map

- Kirk–Evers: `neophilism/Galinsky-2028` @ `main`, allowlisted `content/policies/source/kirk-evers-*.txt|pdf`. The original full 58-page PDF has been provided to ChatGPT and matches the existing discussion-draft source, but **the PDF binary is not yet committed** in GitHub. The existing `kirk-evers-discussion-2026-09-10.txt` remains the accessible source. Do not claim PDF publication or strip its discussion-draft wording. Future approved PDF uploads should be placed at the corresponding allowlisted source path by an authorized operator.
- The Garden: `neophilism/The-Garden` @ `docs/policy-research-source-library-20261012`, `policy/legislation/` bills and notes + `policy/supporting/garden.docx`. **Exclude** `policy/historical-research/` and all working archives. Its repository expressly distinguishes proposed bill originals from uncleared archival/research materials.
- The Cornerstone: `neophilism/The-Cornerstone` @ `main`, the seven owner-supplied policy originals in `policy/`, including federal/model-state acts, policy paper, design commentary, census, event evidence and speech captions. These remain proposed legislation/research, never enacted law.

## Integration and authentication

The existing password-protected web service serves `/policy-library/{kirk-evers|garden|cornerstone}/` and verified `/download/{git_blob_sha}` resources. It queries GitHub's current source branch tree with a restricted fine-grained token. Every file is allowlisted, size-bounded, fetched by an exact current-tree Git object SHA, and checked against the Git SHA-1 blob digest before serving as an attachment. The source index caches for up to 60 seconds. No private GitHub link, token, raw bank number, user-uploaded URL or unreviewed working archive is exposed in the HTML. The current repo does not mirror the source files, so future changes in the designated branch appear without redeployment.

Set `G28_POLICY_READ_TOKEN` on the **existing** Render private-web service `srv-db5teuajnfac73bm8pug` (a pre-existing `GITHUB_READ_TOKEN` with sufficient read-only access may be used instead). The token must have **Contents: Read** for exactly the three PRIVATE repositories listed above, and no write, billing, organization-admin or personal access. Store it only in Render's protected environment-variable editor; not GitHub source, ChatGPT chat or web-browser localStorage. No source is returned if the token is absent or the upstream GitHub API refuses the request; the page reports a temporary 503. Do not claim this operational until an authenticated browser request proves downloads from all three repositories.

Importantly, the live website does not rely on GitHub Actions scheduled workflows or consumer GitHub Actions minutes. This service performs read-only lookups on demand. Repository docs may be changed by any authorized collaborator, following their own review/merge requirements; campaign-page changes are not needed.

## Cautions

- The Garden branch is **not main**: changes on `main` alone do not appear until reflected on the specified Garden source branch.
- A replacement at the same allowed path appears automatically; authorized new files that match the narrow allowlist are discovered. Other new paths require an explicit source scope review.
- Password authorization protects current previews; this feature does not publish the source repositories or the private policy directory generally.
- If future public deployment is requested, the owner must approve public access to only the declared policy originals, validate any remaining sensitive metadata, and check final legal/attribution copy. Do not automatically remove the password because files are readable internally.
