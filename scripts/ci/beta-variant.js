// CI (nhánh beta): biến app thành "ZYX Beta" — app riêng cài song song với bản ổn định.
// Đổi tên, mã gói (.beta), scheme, icon có nhãn BETA, phiên bản/runtime beta và kênh cập nhật "beta".
const fs = require('fs');
const VERSION = '1.2.0'; // tăng khi beta đổi code native (runtime đi theo số này)
const j = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const e = j.expo;
e.name = 'ZYX Beta';
e.version = VERSION;
e.runtimeVersion = VERSION;
e.scheme = 'zyx-beta';
e.icon = './assets/beta/icon.png';
e.ios.bundleIdentifier = 'com.henrywizzrd.zyx.beta';
e.android.package = 'com.henrywizzrd.zyx.beta';
e.android.adaptiveIcon.foregroundImage = './assets/beta/android-icon-foreground.png';
e.updates.requestHeaders['expo-channel-name'] = 'beta';
fs.writeFileSync('app.json', JSON.stringify(j, null, 2) + '\n');
console.log(`ZYX Beta ${VERSION} · ${e.ios.bundleIdentifier} · kênh beta`);
