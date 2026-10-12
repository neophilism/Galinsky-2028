# Video and issue destination handoff

Each individual issue page has a large, privacy-conscious YouTube player at the top, followed by its summary. IDs intentionally remain unset until the candidate provides links. Do **not** use sample test IDs or unrelated video placeholders on the public site.

When an issue video or dedicated project website is supplied, use:

```sh
npm run issue:prepare -- --issue kirk-evers --youtube "https://www.youtube.com/watch?v=REAL_ID"
npm run issue:prepare -- --issue garden --youtube "https://youtu.be/REAL_ID" --write
npm run issue:prepare -- --issue cornerstone --website "https://verified-project.example/" --write
npm run issue:prepare -- --issue garden --transcript "path/to/reviewed-transcript.txt" --write
```

The first command is a dry run; `--write` is required to change `content/public/site.json`. The helper accepts only the configured three launch issues, validates secure YouTube formats and public HTTPS website destinations, and caps plain-text transcripts at 200 KB. It does not upload video, check YouTube publishing settings, approve sources, change the release mode, enable donations or deploy.

After preparing a change, review the Git diff and open a PR with the actual editorial approvals, source links and caption/transcript review. CI validates the updated config. Production publication remains a distinct release gate. Video playback is opt-in and contacts YouTube only after a visitor activates it. If a video cannot be embedded, the text summary must remain usable.


## Owner-authorized temporary MP4 on PRIVATE preview (October 2026)

The owner expressly provided a 15-second clip to play temporarily on all
three launch issues. This is unrelated illustrative footage, **not an
issue-specific presentation**. Use only the password-protected preview;
the production renderer refuses to display this temporary file. A clearly
visible on-video label discloses its illustrative status.

The prepared, optimized H.264/AAC MP4 is 2,165,255 bytes and has SHA-256
`bab062faf1ed9b647daf73a40dbbeebf63ae04d8dfe669c43605697e56a20f5f`.
The unmodified owner-uploaded original is 11,042,542 bytes and has SHA-256
`8714bdde5cfced03ec49d90e26e7b83b08131f6f0312a1fd7228427b15ea16a7`.
Both editions are allowed by CI; the smaller one is recommended for a
private-preview page.

An authorized operator must place the owner-supplied prepared media **exactly**
at `apps/web/public/assets/issue-video-placeholder.mp4` in the
PRIVATE repository via a reviewed GitHub upload/commit. A new binary
cannot be sent from the ChatGPT isolated file container to GitHub through
the available connector. Never synthesize unrelated content or use an
external, analytics-bearing video host as a workaround.

After CI passes and the upload PR is merged, redeploy the private Render
web service (auto deploy is OFF), open each of the three issue pages behind
the preview password, and verify player playback and a 206 byte-range
request. Before the binary exists, the site correctly shows "coming soon"
rather than a broken player. Do not declare this complete merely because
the source configuration references the absent file.

The final issue-specific videos need their own publication approval,
captions/transcripts and verified links before public production release.
