// CI: ghi kênh cập nhật OTA vào app.json trước khi build (bản ổn định [release] → "production", bản thử → giữ "preview")
const fs = require('fs');
const ch = process.argv[2];
if (!ch) throw new Error('thiếu tên kênh');
const j = JSON.parse(fs.readFileSync('app.json', 'utf8'));
j.expo.updates.requestHeaders['expo-channel-name'] = ch;
fs.writeFileSync('app.json', JSON.stringify(j, null, 2) + '\n');
console.log(`Kênh cập nhật: ${ch} · phiên bản ${j.expo.version}`);
