import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
writeFileSync(
  'public/release.json',
  `${JSON.stringify({
    app: 'smoke',
    framework: '3.2.0',
    commit: git('rev-parse', 'HEAD'),
    dirty: Boolean(git('status', '--porcelain')),
  })}\n`,
);
