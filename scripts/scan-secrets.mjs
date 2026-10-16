import { execFileSync } from 'node:child_process';
import { readFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Credential patterns, not a claim that arbitrary sensitive prose is detected.
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ['stripe-secret', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{24,}\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['database-credentials', /\bpostgres(?:ql)?:\/\/[^\s/:'"<>]+:([^\s@'"<>]+)@[^\s'"<>]+/g],
];
export function scanSecrets(text) {
  const findings = [];
  for (const [kind, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      // The sole committed credential-URL exception is the documented disposable
      // CI database on loopback. It cannot be used to reach a deployed database.
      if (
        kind === 'database-credentials' &&
        /^postgresql:\/\/g28test:g28local@127\.0\.0\.1:5432\/g28test$/.test(match[0])
      )
        continue;
      findings.push({ kind, line: text.slice(0, match.index).split('\n').length });
    }
  }
  return findings;
}
export function scanRepository() {
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean),
    findings = [];
  for (const path of paths) {
    if (/(^|\/)\.env(?:\.(?:local|production|staging|test))?$/.test(path))
      findings.push({ path, kind: 'environment-file', line: 1 });
    if (lstatSync(path).isSymbolicLink()) {
      findings.push({ path, kind: 'symlink-review-required', line: 1 });
      continue;
    }
    const bytes = readFileSync(path);
    if (bytes.includes(0)) continue;
    for (const finding of scanSecrets(bytes.toString('utf8'))) findings.push({ path, ...finding });
  }
  return { files: paths.length, findings };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = scanRepository();
  // Deliberately never print a matched credential or source line.
  console.log(JSON.stringify(result, null, 2));
  if (result.findings.length) process.exitCode = 1;
}
