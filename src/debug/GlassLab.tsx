import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { LiquidGlass } from '../components/Glass';
import { Freeze } from '../components/Freeze';
import { log } from '../data/applog';

// MÀN "THỬ KÍNH" (tạm thời, để dò lỗi): kính Liquid Glass + khung vẽ Skia hay mất hiệu ứng / biến mất. Ba dòng giống hệt
// nhau, chỉ khác cách bị ẩn:
//   A. luôn hiện (đối chứng)
//   B. bật / tắt bằng display: none   (cách app ẩn tab, ẩn player lúc đóng)
//   C. đóng băng bằng Freeze           (cách app đóng băng tab ẩn / player đóng — React Suspense)
// Cách thử: bấm ẩn / hiện B và C vài lần, cho app xuống nền 1–2 phút rồi mở lại, xem dòng nào mất kính / mất vòng tròn.
// Mỗi lần bấm ghi vào nhật ký ("thử kính: …")

// vòng cung 3/4 (vẽ kiểu như thanh thời gian đĩa than)
const ring = Skia.Path.MakeFromSVGString('M28 6 A22 22 0 1 1 6 28')!;

function Sample({ label }: { label: string }) {
  const GV = LiquidGlass?.GlassView;
  return (
    <View style={styles.sample}>
      {/* nền nhiều màu phía sau để thấy rõ kính có khúc xạ / làm mờ hay không */}
      <LinearGradient colors={['#ff4d6d', '#ffd166', '#06d6a0', '#118ab2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.card}>
        {GV ? <GV glassEffectStyle="clear" style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} /> : null}
        <Text style={styles.cardText}>{GV ? `kính ${label}` : 'máy không có Liquid Glass'}</Text>
      </View>
      <Canvas style={styles.canvas}>
        <Circle cx={28} cy={28} r={10} color="#ffffff" />
        <Path path={ring} style="stroke" strokeWidth={5} strokeCap="round" color="#1b1b1f" />
      </Canvas>
    </View>
  );
}

export function GlassLab({ text, sub, accent }: { text: string; sub: string; accent: string }) {
  const [hideB, setHideB] = useState(false);
  const [freezeC, setFreezeC] = useState(false);
  const [nB, setNB] = useState(0);
  const [nC, setNC] = useState(0);
  const toggleB = () => {
    const v = !hideB;
    setHideB(v);
    if (v) setNB((n) => n + 1);
    log('ui', `thử kính: B ${v ? 'ẨN (display: none)' : 'hiện lại'}${v ? ` · lần ${nB + 1}` : ''}`);
  };
  const toggleC = () => {
    const v = !freezeC;
    setFreezeC(v);
    if (v) setNC((n) => n + 1);
    log('ui', `thử kính: C ${v ? 'ĐÓNG BĂNG (Freeze)' : 'rã đông'}${v ? ` · lần ${nC + 1}` : ''}`);
  };
  return (
    <View style={{ marginTop: 8, gap: 10 }}>
      <Text style={{ color: sub, fontSize: 12 }}>
        Bấm ẩn / hiện B và C vài lần → cho app xuống nền 1–2 phút → mở lại. Dòng nào mất kính hoặc mất vòng tròn đen thì chụp màn hình gửi
        kèm nhật ký.
      </Text>
      <Text style={{ color: text, fontWeight: '700' }}>A. Luôn hiện</Text>
      <Sample label="A" />
      <Pressable onPress={toggleB} hitSlop={6}>
        <Text style={{ color: accent, fontWeight: '700' }}>B. display: none — {hideB ? 'đang ẩn · bấm để hiện' : 'đang hiện · bấm để ẩn'} (đã ẩn {nB} lần)</Text>
      </Pressable>
      <View style={{ display: hideB ? 'none' : 'flex' }}>
        <Sample label="B" />
      </View>
      <Pressable onPress={toggleC} hitSlop={6}>
        <Text style={{ color: accent, fontWeight: '700' }}>C. Freeze — {freezeC ? 'đang đóng băng · bấm để rã' : 'đang chạy · bấm để đóng băng'} (đã đóng băng {nC} lần)</Text>
      </Pressable>
      <Freeze freeze={freezeC}>
        <Sample label="C" />
      </Freeze>
    </View>
  );
}

const styles = StyleSheet.create({
  sample: { height: 76, borderRadius: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 12 },
  card: { width: 170, height: 56, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 14 },
  cardText: { color: '#fff', fontWeight: '800' },
  canvas: { width: 56, height: 56 },
});
