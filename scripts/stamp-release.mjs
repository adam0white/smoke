import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
writeFileSync(
  'public/release.json',
  `${JSON.stringify({
    app: 'smoke',
    framework: JSON.parse(readFileSync('package.json', 'utf8')).dependencies['@adam0white/human-framework'],
    commit: git('rev-parse', 'HEAD'),
    dirty: Boolean(git('status', '--porcelain')),
  })}\n`,
);
