// Copies the freshly built release APK to ../jjplatform-v<versionName>.apk so QA can
// identify the build at a glance. Run from frontend/android (after assembleRelease).
import { readFileSync, copyFileSync } from 'node:fs';

const gradle = readFileSync('app/build.gradle', 'utf8');
const match = gradle.match(/versionName\s+"([^"]+)"/);
if (!match) {
  console.error('rename-apk: no se encontró versionName en app/build.gradle');
  process.exit(1);
}
const version = match[1];
const src = 'app/build/outputs/apk/release/app-release.apk';
const dest = `../jjplatform-v${version}.apk`;
copyFileSync(src, dest);
console.log(`APK listo: jjplatform-v${version}.apk`);
