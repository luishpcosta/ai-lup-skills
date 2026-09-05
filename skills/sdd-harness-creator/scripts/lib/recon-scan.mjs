// Filesystem/git side of the recon. Kept apart from recon.mjs so the
// extractors stay pure and unit-testable.

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { exists, listFiles, readJson, readText } from './sdd-utils.mjs';
import { detectSourceRoot, extOf, extractExports, extractTestNames, groupIntoModules } from './reverse.mjs';
import { attachExternalTests, buildModuleEntry, parseGitSubjects, signalsForRung } from './recon.mjs';

const run = promisify(execFile);

/** Rung 1 signals about the repo as a whole: manifest, README headings, docs. */
export async function projectSignals(target, files) {
  const signals = { name: '', description: '', scripts: [], docs: [], apiSpecs: [] };

  const manifestPath = path.join(target, 'package.json');
  if (await exists(manifestPath)) {
    try {
      const manifest = await readJson(manifestPath);
      signals.name = manifest.name ?? '';
      signals.description = manifest.description ?? '';
      signals.scripts = Object.keys(manifest.scripts ?? {});
    } catch { /* an unreadable manifest is just one missing signal */ }
  }

  const readme = files.find((file) => /^readme\.md$/i.test(file));
  if (readme) {
    const content = await readText(path.join(target, readme));
    signals.headings = content.split('\n').filter((line) => /^#{1,3}\s/.test(line)).slice(0, 12).map((line) => line.trim());
  }

  signals.docs = files.filter((file) => file.startsWith('docs/')).slice(0, 20);
  signals.apiSpecs = files.filter((file) => /(openapi|swagger)\.(ya?ml|json)$|\.proto$|migrations?\//i.test(file)).slice(0, 20);
  return signals;
}

async function gitSubjectsFor(target, paths) {
  try {
    const { stdout } = await run('git', ['log', '--format=%s', '-n', '30', '--', ...paths], { cwd: target });
    return parseGitSubjects(stdout);
  } catch {
    return []; // no git, shallow clone, or an unborn branch — just one missing signal
  }
}

/**
 * Scan a target repo into module entries. The script reads files; only the
 * bounded digest built here is ever meant to reach a model's context.
 */
export async function scanTarget({ target, src, budget = 40, rungs = {}, maxFiles = 4000 } = {}) {
  const files = await listFiles(target, { maxFiles });
  const sourceRoot = src !== undefined ? String(src).replace(/\/$/, '') : detectSourceRoot(files);
  const modules = attachExternalTests(files, groupIntoModules(files, sourceRoot));
  const project = await projectSignals(target, files);

  const entries = [];
  for (const module of modules) {
    const rung = Number(rungs[module.name] ?? 1);
    const signals = signalsForRung(rung);
    const contents = {};
    const exported = [];
    for (const file of module.sourceFiles) {
      const content = await readText(path.join(target, file));
      contents[file] = content;
      exported.push(...extractExports(content, extOf(file)));
    }
    const testNames = [];
    for (const file of module.testFiles) {
      testNames.push(...extractTestNames(await readText(path.join(target, file))));
    }
    const gitSubjects = signals.includes('gitSubjects')
      ? await gitSubjectsFor(target, module.sourceFiles)
      : [];

    entries.push(buildModuleEntry({ module, contents, testNames, exports: exported, gitSubjects, rung, budget }));
  }

  entries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return { sourceRoot, project, modules: entries };
}
