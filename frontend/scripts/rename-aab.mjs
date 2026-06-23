// Copies the freshly built release AAB to ../jjplatform-v<versionName>.aab so it's easy to find
// and upload to Play Console. Run from frontend/android (after bundleRelease).
import { readFileSync, copyFileSync } from 'node:fs';

const gradle = readFileSync('app/build.gradle', 'utf8');
const match = gradle.match(/versionName\s+"([^"]+)"/);
if (!match) {
  console.error('rename-aab: no se encontró versionName en app/build.gradle');
  process.exit(1);
}
const version = match[1];
const src = 'app/build/outputs/bundle/release/app-release.aab';
const dest = `../jjplatform-v${version}.aab`;
copyFileSync(src, dest);
console.log(`AAB listo para Play Store: jjplatform-v${version}.aab`);
