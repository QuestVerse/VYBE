// Hiệu ứng "nảy vào chỗ" ngay sau khi xoay máy (dọc ⇄ ngang), dùng chung cho các tab (Home có bản riêng theo từng khối).
// Xoay máy thì bố cục đổi hẳn (một cột ⇄ hai cột) nên các khối được dựng lại từ đầu → trước đây chúng "nhảy" sang chỗ mới.
// Giờ trong ~0,9 giây sau khi xoay, khối nào mới dựng sẽ trượt vào chỗ bằng lò xo, lần lượt cách nhau 45ms:
// màn dọc trượt từ dưới lên, màn ngang cột trái trượt từ trái, cột phải từ phải. Mở app / đổi tab bình thường thì không chạy.
// CHỈ trượt, không mờ dần (khung mờ dần từng làm mất kính — xem Glass.tsx)
import { useReducedMotion, withDelay, withSpring } from 'react-native-reanimated';

let lastLand: boolean | null = null;
let rotatedAt = 0;

// Gọi lúc ThemeProvider tính hướng màn hình (trước khi các màn bên trong dựng lại)
export function noteOrientation(land: boolean) {
  if (lastLand !== null && lastLand !== land) rotatedAt = Date.now();
  lastLand = land;
}

export type EnterFrom = 'up' | 'left' | 'right';

// Trả về hàm enter(i, from) để gắn vào `entering` của Animated.View; ngoài lúc vừa xoay thì trả undefined (không hiệu ứng)
export function useRotateEnter() {
  const reduced = useReducedMotion();
  const settling = !reduced && Date.now() - rotatedAt < 900;
  return (i: number, from: EnterFrom) => {
    if (!settling) return undefined;
    const dx = from === 'left' ? -60 : from === 'right' ? 60 : 0;
    const dy = from === 'up' ? 40 : 0;
    const delay = i * 45;
    return () => {
      'worklet';
      const cfg = { damping: 15, stiffness: 170, mass: 0.9 };
      return {
        initialValues: { transform: [{ translateX: dx }, { translateY: dy }] },
        animations: { transform: [{ translateX: withDelay(delay, withSpring(0, cfg)) }, { translateY: withDelay(delay, withSpring(0, cfg)) }] },
      };
    };
  };
}
