/**
 * Verify shortlink redirect chain after Phase 2 edge rule.
 *
 * Expect:
 *   https://assetwise.co.th/c/{code}  → 301 → https://link.assetwise.co.th/{code}
 *   https://link.assetwise.co.th/{code} → 301/302 → long URL
 *
 * Usage:
 *   node scripts/verify-shortlink-redirects.mjs
 *   node scripts/verify-shortlink-redirects.mjs 7Wysn CSLmi 2N0nH
 */

const codes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['7Wysn', 'CSLmi', '2N0nH', 'ezvMV', 'ZT4js'];

async function head(url) {
  const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
  return {
    status: res.status,
    location: res.headers.get('location') || '',
  };
}

let fail = 0;
for (const code of codes) {
  const oldUrl = `https://assetwise.co.th/c/${code}`;
  const newUrl = `https://link.assetwise.co.th/${code}`;
  const oldRes = await head(oldUrl);
  const newRes = await head(newUrl);

  const oldOk =
    oldRes.status >= 300 &&
    oldRes.status < 400 &&
    oldRes.location.replace(/\/+$/, '') === newUrl.replace(/\/+$/, '');
  const newOk = newRes.status >= 300 && newRes.status < 400 && Boolean(newRes.location);

  console.log(`\n${code}`);
  console.log(`  old: ${oldRes.status} → ${oldRes.location || '(none)'} ${oldOk ? 'OK' : 'FAIL (want 301 to TinyURL)'}`);
  console.log(`  new: ${newRes.status} → ${newRes.location || '(none)'} ${newOk ? 'OK' : 'FAIL'}`);

  if (!oldOk || !newOk) fail += 1;
}

console.log(`\nDone: ${codes.length - fail}/${codes.length} passed`);
if (fail) process.exitCode = 1;
