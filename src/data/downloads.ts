import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import type { Track } from './mock';
import { getDownloads, kvGet, kvSet, setDownload } from './db';
import { ytmusic } from '../music/lazy';
import { log } from './applog';
import { rangeDownload } from './rangeDownload';

// Tải bài về máy để nghe không cần mạng.
// File lưu trong thư mục Documents/downloads của app (iOS không tự xoá như thư mục cache).
// Tải đúng loại link mà app đang phát (mp4 có âm thanh, iPhone phát được), nên phát lại y như online.

export type DownloadState = 'none' | 'downloading' | 'done';

const busy = new Set<string>();
let files: Map<string, string> | null = null; // id bài → tên file
const progress = new Map<string, number>(); // id → 0..1 while downloading
const listeners = new Set<() => void>();
let version = 0; // bumps on every change, so lists know when to redraw their rows
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

// 0..1 for a song being downloaded (0 if unknown)
export const downloadProgress = (id: string) => progress.get(id) ?? 0;

function fs() {
  return require('expo-file-system') as typeof import('expo-file-system');
}
function dir() {
  const { Directory, Paths } = fs();
  const d = new Directory(Paths.document, 'downloads');
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}
function known() {
  if (!files) files = getDownloads();
  return files;
}

export function downloadState(id: string): DownloadState {
  if (busy.has(id)) return 'downloading';
  return known().has(id) ? 'done' : 'none';
}

// Đường dẫn file đã tải (null nếu chưa tải, hoặc file đã mất)
export function localUri(id: string): string | null {
  if (Platform.OS === 'web') return null;
  const name = known().get(id);
  if (!name) return null;
  try {
    const f = new (fs().File)(dir(), name);
    if (f.exists) return f.uri;
  } catch {}
  return null;
}

export async function download(t: Track): Promise<boolean> {
  if (Platform.OS === 'web' || busy.has(t.id) || known().has(t.id)) return known().has(t.id);
  busy.add(t.id);
  emit();
  try {
    // Chỉ tải âm thanh (mp4a), không tải hình: nhẹ hơn 3-4 lần so với bản video 360p, tiếng cũng tốt hơn
    const t0 = Date.now();
    const name = `${t.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
    const target = new (fs().File)(dir(), name);
    let bytes = 0;
    // Tải từng khúc (xem rangeDownload.ts).
    // Lần 1: bản CHỈ ÂM THANH (nhẹ hơn 3–4 lần). YouTube hay chặn tải loại này (403) dù vẫn cho phát.
    // Lần 2: đúng bản trình phát đang dùng (mp4 360p có cả hình + tiếng) — nghe online được thì tải loại này được
    let kind = 'âm thanh';
    for (let attempt = 0; ; attempt++) {
      const muxed = attempt > 0;
      const info = await ytmusic().getAudio(t.id, undefined, muxed);
      try {
        progress.set(t.id, 0);
        bytes = await rangeDownload(info.url, target, (done, total) => {
          if (!total) return;
          const f = done / total;
          // redraw at most every 5%, so a long song doesn't redraw the list on every chunk
          if (f - (progress.get(t.id) ?? 0) < 0.05 && f < 1) return;
          progress.set(t.id, f);
          emit();
        });
        kind = muxed ? 'bản trình phát (mp4 360p)' : 'âm thanh';
        break;
      } catch (e) {
        if (attempt >= 1 || !(e as { status?: number })?.status) throw e;
        log('music', `tải bài: bản chỉ âm thanh bị chặn (${(e as Error).message}), tải bản trình phát — ${t.title}`);
      }
    }
    known().set(t.id, name);
    setDownload(t, name);
    log('music', `đã tải xong: ${t.title} (${kind}, ${(bytes / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(1)} giây)`);
    return true;
  } catch (e) {
    console.warn('[download]', t.title, e);
    log('error', `tải bài lỗi: ${t.title} — ${e instanceof Error ? e.message : String(e)}`);
    return false;
  } finally {
    busy.delete(t.id);
    progress.delete(t.id);
    emit();
  }
}

export function removeDownload(t: Track) {
  const name = known().get(t.id);
  if (name) {
    try {
      const f = new (fs().File)(dir(), name);
      if (f.exists) f.delete();
    } catch {}
  }
  known().delete(t.id);
  setDownload(t, null);
  emit();
}

// Màn hình nào cần hiện trạng thái tải thì dùng hook này để tự cập nhật
export function useDownloads() {
  const [, setV] = useState(0);
  useEffect(() => {
    const l = () => setV((v) => v + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return downloadState;
}

// Changes whenever any download starts, moves or finishes (for list extraData / memo deps)
export function useDownloadVersion() {
  useDownloads();
  return version;
}

// ---- Chỉ hiện bài đã tải (nút "Đã tải" ở Thư viện) ----
// Bật: Thư viện chỉ còn các playlist có bài đã tải (Bài hát đã thích + playlist của mình), mở playlist / album nào
// cũng chỉ thấy bài đã tải. Tắt là hiện lại đủ. Nhớ giữa các lần mở app
let onlyDownloaded: boolean | null = null; // đọc lần đầu khi cần (lúc nạp file này cơ sở dữ liệu có thể chưa sẵn)
const onlyListeners = new Set<() => void>();
export function getOnlyDownloaded(): boolean {
  if (onlyDownloaded === null) {
    try {
      onlyDownloaded = kvGet<boolean>('lib:onlyDownloaded') === true;
    } catch {
      onlyDownloaded = false;
    }
  }
  return onlyDownloaded;
}
export function setOnlyDownloaded(v: boolean) {
  onlyDownloaded = v;
  kvSet('lib:onlyDownloaded', v);
  onlyListeners.forEach((l) => l());
}
export function useOnlyDownloaded(): boolean {
  return useSyncExternalStore(
    (l) => {
      onlyListeners.add(l);
      return () => {
        onlyListeners.delete(l);
      };
    },
    getOnlyDownloaded
  );
}
export const isDownloaded = (id: string) => known().has(id);

// ---- Tải cả album / playlist (nút tải cạnh nút Phát ở trang danh sách bài — Tyson 21/11) ----
// Chạy ở đây (ngoài màn hình) nên rời trang vẫn tải tiếp. Tải 2 bài cùng lúc, bài nào lỗi thì bỏ qua và đếm lại.
// key: định danh danh sách (vd. "yt:<id>"); mỗi danh sách chỉ có một lượt tải chạy cùng lúc
type Batch = { done: number; failed: number; total: number; cancelled: boolean };
const batches = new Map<string, Batch>();
export function batchOf(key: string): Batch | null {
  return batches.get(key) ?? null;
}
export async function downloadAll(key: string, tracks: Track[], label: string) {
  if (Platform.OS === 'web' || batches.has(key)) return;
  const todo = tracks.filter((t) => !known().has(t.id));
  if (!todo.length) return;
  const b: Batch = { done: 0, failed: 0, total: todo.length, cancelled: false };
  batches.set(key, b);
  emit();
  log('music', `tải cả "${label}": bắt đầu ${todo.length} bài`);
  const t0 = Date.now();
  let next = 0;
  const worker = async () => {
    while (!b.cancelled && next < todo.length) {
      const t = todo[next++];
      if (await download(t)) b.done++;
      else b.failed++;
      emit();
    }
  };
  await Promise.all([worker(), worker()]);
  batches.delete(key);
  emit();
  log(
    'music',
    `tải cả "${label}": ${b.cancelled ? 'đã dừng giữa chừng' : 'xong'} — tải được ${b.done}/${b.total} bài` +
      `${b.failed ? `, ${b.failed} bài lỗi` : ''} (${Math.round((Date.now() - t0) / 1000)} giây)`
  );
}
// Dừng lượt tải: bài đang tải dở vẫn tải nốt, các bài sau thì thôi
export function cancelBatch(key: string) {
  const b = batches.get(key);
  if (b) b.cancelled = true;
  emit();
}
// Xoá bản tải của cả danh sách (vẫn nghe online được)
export function removeAll(tracks: Track[]) {
  let n = 0;
  for (const t of tracks) {
    if (!known().has(t.id)) continue;
    removeDownload(t);
    n++;
  }
  if (n) log('music', `xoá bản tải: ${n} bài`);
}
