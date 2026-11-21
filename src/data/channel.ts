// Bản đang chạy là bản ổn định cho người dùng (kênh cập nhật "production") hay bản thử của Tyson (kênh "preview").
// Kênh được ghi vào app lúc build (app.json → updates.requestHeaders, CI đổi sang "production" khi build [release]).
// Dùng để ẩn các phần chỉ dành cho dò lỗi (bảng tắt từng phần của player trong Nhật ký...) khỏi người dùng thường
let stable: boolean | null = null;
export function isStableBuild(): boolean {
  if (stable != null) return stable;
  try {
    const U = require('expo-updates') as typeof import('expo-updates');
    stable = U.channel === 'production';
  } catch {
    stable = false;
  }
  return stable;
}
