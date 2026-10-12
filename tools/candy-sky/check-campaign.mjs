import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const url = 'http://127.0.0.1:5175/';
let server;
const ready = async () => {
  try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); return response.ok && (await response.text()).includes('<title>Clone Rush</title>'); }
  catch { return false; }
};
const run = args => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${args.join(' ')} exited ${code}`)));
});
try {
  if (!await ready()) {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'], { stdio: 'inherit' });
    for (let attempt = 0; attempt < 100 && !await ready(); attempt++) await delay(200);
    if (!await ready()) throw new Error(`Test server unavailable at ${url}`);
  }
  await run(['--test', '--test-reporter=spec', 'tools/candy-sky/cleanup-regressions.test.mjs', 'tools/candy-sky/extension-regressions.test.mjs', 'tools/candy-sky/campaign-regressions.test.mjs', 'tools/candy-sky/progress-regressions.test.mjs', 'tools/candy-sky/island-geometry.test.mjs', 'tools/candy-sky/portal-presentation.test.mjs']);
  for (const file of ['verify-gravity-presentation', 'verify-underside-contact', 'verify-campaign-runtime', 'verify-campaign-viewports', 'verify-level-selection', 'verify-extension-selection', 'verify-runtime-assets']) {
    console.log(`\nRunning ${file}`);
    await run([`tools/candy-sky/${file}.mjs`]);
  }
  console.log('\nCampaign checks passed. Reports: docs/campaign/candy-sky-v2/');
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally {
  server?.kill('SIGTERM');
}
