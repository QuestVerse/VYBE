// CI: ký APK bằng khoá riêng của ZYX (thay cho khoá debug công khai có sẵn trong mẫu Expo).
// Chạy SAU `expo prebuild --platform android`. Cần 4 GitHub Secrets (xem zyx-android-signing.txt Tyson giữ):
//   ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
// Thiếu secret thì giữ nguyên khoá debug (bản thử vẫn build được) và in cảnh báo.
// Bản thử và bản ổn định dùng CHUNG khoá này → người dùng cài đè bản mới lên bản cũ được, không mất dữ liệu.
const fs = require('fs');
const path = require('path');

const b64 = process.env.ANDROID_KEYSTORE_BASE64;
if (!b64) {
  console.log('::warning::Chưa có secret ANDROID_KEYSTORE_BASE64 → APK vẫn ký bằng khoá debug');
  process.exit(0);
}
const app = path.join('android', 'app');
fs.writeFileSync(path.join(app, 'zyx-release.jks'), Buffer.from(b64, 'base64'));

const gradleFile = path.join(app, 'build.gradle');
let g = fs.readFileSync(gradleFile, 'utf8');

// 1. Thêm cấu hình ký "release" vào khối signingConfigs (đọc mật khẩu từ biến môi trường lúc build)
const cfg = `
        release {
            storeFile file('zyx-release.jks')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }`;
if (!/signingConfigs\s*\{/.test(g)) throw new Error('build.gradle: không thấy khối signingConfigs');
g = g.replace(/signingConfigs\s*\{/, (m) => m + cfg);

// 2. Bản release dùng khoá đó (mẫu Expo để signingConfig signingConfigs.debug trong buildTypes.release)
const bt = g.indexOf('buildTypes');
const rel = g.indexOf('release {', bt);
const use = g.indexOf('signingConfig signingConfigs.debug', rel);
if (bt < 0 || rel < 0 || use < 0) throw new Error('build.gradle: không thấy signingConfig của buildTypes.release');
g = g.slice(0, use) + 'signingConfig signingConfigs.release' + g.slice(use + 'signingConfig signingConfigs.debug'.length);

fs.writeFileSync(gradleFile, g);
console.log('Đã cấu hình ký APK bằng khoá riêng của ZYX');
