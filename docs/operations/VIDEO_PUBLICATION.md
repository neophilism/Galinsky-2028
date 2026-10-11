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
