# Skill cho dự án ZYX

Claude Code tự nhận các skill trong thư mục này khi mở dự án.

- `ui-ux-pro-max/` — chọn style, màu, font và quy tắc UX (kèm bộ dữ liệu tra cứu, chạy bằng Python 3:
  `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<từ khoá>" --domain style|color|typography|ux`).
  Nguồn: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT). Chỉ lấy skill chính, bỏ các bộ cho web/slide/banner.
- Các skill animation / thiết kế của Emil Kowalski (`animate-expo`, `gestures`, `mobile-native`, `apple-design`,
  `improve-animations`, `review-animations`, `animation-performance`...).
  Nguồn: https://github.com/emilkowalski/skills (MIT). Với app này (Expo / React Native) dùng `animate-expo`, không phải `animate` (bản web).
- `speckit-*/` — Spec Kit (viết spec → plan → tasks → implement cho tính năng mới), đi kèm thư mục `.specify/`
  (mẫu spec/plan/tasks, luật chung `memory/constitution.md`, script bash). Luồng: `/speckit-constitution` → `/speckit-specify`
  → (`/speckit-clarify`) → `/speckit-plan` → `/speckit-tasks` → (`/speckit-analyze`) → `/speckit-implement`.
  Nguồn: https://github.com/github/spec-kit (MIT), cài bằng `uv tool install specify-cli` rồi `specify init --here --integration claude`
  (bản 1.4.3). Cập nhật: chạy lại lệnh init đó (thêm `--force`).

Cập nhật: clone lại hai repo trên rồi chép đè thư mục tương ứng.
