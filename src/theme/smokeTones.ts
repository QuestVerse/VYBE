// Bộ "Khói màu": dải màu người dùng chọn cho nền khói (shader ở effects/smoke.ts) + bảng màu giao diện ăn theo dải đó.
// Mỗi dải có 4 màu cho shader (0..1): c0 nền tối, c1 khói chính, c2 vệt sáng, c3 bóng tối — cùng thứ tự với player đĩa than.
// 'cover': lấy màu từ ảnh bìa bài đang phát (coverTint), chưa có bài thì dùng dải cà phê
import type { Palette } from './presets';

export type SmokeTone = 'coffee' | 'violet' | 'ocean' | 'wine' | 'ash' | 'moss' | 'cover';
export const SMOKE_TONES: SmokeTone[] = ['coffee', 'violet', 'ocean', 'wine', 'ash', 'moss', 'cover'];

type Rgb = [number, number, number];
export const SMOKE_COLORS: Record<Exclude<SmokeTone, 'cover'>, { c: [Rgb, Rgb, Rgb, Rgb]; accent: string }> = {
  coffee: { c: [[0.07, 0.035, 0.018], [0.36, 0.2, 0.075], [0.62, 0.38, 0.13], [0.17, 0.085, 0.035]], accent: '#E8A862' },
  violet: { c: [[0.04, 0.02, 0.08], [0.22, 0.1, 0.38], [0.5, 0.3, 0.78], [0.12, 0.05, 0.22]], accent: '#BBA2FF' },
  ocean: { c: [[0.01, 0.04, 0.08], [0.05, 0.2, 0.36], [0.15, 0.5, 0.7], [0.03, 0.1, 0.2]], accent: '#72CCFF' },
  wine: { c: [[0.07, 0.01, 0.03], [0.36, 0.06, 0.14], [0.68, 0.2, 0.3], [0.18, 0.03, 0.08]], accent: '#FF8099' },
  ash: { c: [[0.04, 0.04, 0.05], [0.2, 0.2, 0.22], [0.45, 0.45, 0.48], [0.11, 0.11, 0.12]], accent: '#DADAE2' },
  moss: { c: [[0.02, 0.05, 0.03], [0.12, 0.28, 0.14], [0.36, 0.55, 0.28], [0.06, 0.14, 0.07]], accent: '#A2E27F' },
};

const to255 = (c: Rgb, k = 1) => c.map((v) => Math.round(Math.max(0, Math.min(1, v * k)) * 255)) as Rgb;
const hex = (c: number[]) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
export function hexToRgb01(h: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})/i.exec(h);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// 4 màu shader (12 số liền nhau) cho dải đang chọn. cover: dựng từ nền + màu nhấn của ảnh bìa
export function smokeUniformColors(tone: SmokeTone, cover?: { bg: string; accent: string } | null): number[] {
  if (tone === 'cover') {
    const a = cover ? hexToRgb01(cover.accent) : null;
    const b = cover ? hexToRgb01(cover.bg) : null;
    if (!a || !b) return SMOKE_COLORS.coffee.c.flat();
    const k = (c: Rgb, f: number): Rgb => [c[0] * f, c[1] * f, c[2] * f];
    return [k(b, 0.55), k(a, 0.5), k(a, 0.92), k(a, 0.22)].flat();
  }
  return SMOKE_COLORS[tone].c.flat();
}

// Bảng màu giao diện theo dải: nền tối của dải, thẻ / kính ngả theo khói chính, màu nhấn sáng của dải
export function smokePalette(tone: Exclude<SmokeTone, 'cover'>): Partial<Palette> {
  const { c, accent } = SMOKE_COLORS[tone];
  const bg = to255(c[0]);
  const surf = to255(c[3], 1.25);
  const glass = to255(c[3], 0.9);
  return {
    bg: hex(bg),
    surface: hex(surf),
    card: `rgba(${surf.join(',')},0.58)`,
    accent,
    glass: `rgba(${glass.join(',')},0.55)`,
    glassRgb: glass.join(','),
    switchOff: hex(to255(c[1], 0.7)),
  };
}
