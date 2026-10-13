import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const dist = join(root, 'dist');
const release = join(root, 'release');
const sites = ['crazygames', 'gamepix'];
const sha256 = data => createHash('sha256').update(data).digest('hex');

async function files(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await files(path));
    else output.push(path);
  }
  return output;
}

async function auditBuild(directory) {
  const index = await readFile(join(directory, 'index.html'), 'utf8');
  const entries = await files(directory);
  const bytes = (await Promise.all(entries.map(path => stat(path)))).reduce((n, s) => n + s.size, 0);
  if (entries.length > 1500) throw Error(`CrazyGames file limit exceeded: ${entries.length}`);
  if (bytes > 50_000_000) throw Error(`CrazyGames file limit exceeded: ${bytes} bytes`);
  if (/\b(?:src|href)=["']\//i.test(index)) throw Error('Root-relative runtime URL in index.html');
  for (const path of entries) {
    if (!/\.(?:html|js|css|json|png|jpg|jpeg|webp|ogg|mp3|ico|ttf|woff2?|svg|txt|webmanifest)$/i.test(path))
      throw Error(`Unexpected runtime file: ${relative(directory, path)}`);
    if (/\.(?:html|js|css|json)$/.test(path)) {
      const body = await readFile(path, 'utf8');
      if (/https?:\/\//i.test(body) && !path.endsWith('.js')) throw Error(`External URL in ${relative(directory, path)}`);
      if (/CrazyGames\.SDK|gamepix\.com\/sdk|requestAd\(|adBreak\(/i.test(body)) throw Error(`Ad or portal SDK in ${relative(directory, path)}`);
    }
  }
  return { files: entries.length, bytes };
}

await auditBuild(dist);
for (const site of sites) {
  const out = join(release, site);
  const web = join(out, 'web');
  const archive = `clone-rush-${site}.zip`;
  await mkdir(out, { recursive: true });
  await rm(web, { recursive: true, force: true });
  await rm(join(out, 'artwork'), { recursive: true, force: true });
  await rm(join(out, archive), { force: true });
  await mkdir(web, { recursive: true });
  await cp(dist, web, { recursive: true });
  execFileSync('python3', [join(root, 'tools/publishing/optimize-runtime-images.py'), web]);
  const summary = await auditBuild(web);
  if (summary.bytes > 20_000_000) throw Error(`CrazyGames mobile homepage limit exceeded: ${summary.bytes} bytes`);
  await cp(join(root, 'artwork/publishing/covers/exports'), join(out, 'artwork'), { recursive: true });
  if (site === 'crazygames') {
    await rm(join(out, 'previews'), { recursive: true, force: true });
    await cp(join(root, 'artwork/publishing/previews'), join(out, 'previews'), { recursive: true });
  }
  await cp(join(root, `docs/publishing/${site}-submission.md`), join(out, 'submission.md'));
  execFileSync('python3', [join(root, 'tools/publishing/zip-deterministic.py'), web, join(out, archive)]);
  const buffer = await readFile(join(out, archive));
  await writeFile(join(out, 'manifest.json'), JSON.stringify({ site, title: 'Clone Rush', developer: 'Samuele Riccardi', archive, archiveBytes: buffer.length,
    sha256: sha256(buffer), ...summary, ads: false, sdk: false }, null, 2) + '\n');
  console.log(`${site}: ${archive} ${buffer.length} bytes, ${summary.files} files, SHA256 ${sha256(buffer)}`);
}
