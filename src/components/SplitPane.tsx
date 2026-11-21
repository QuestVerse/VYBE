import React from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useContentInsets } from './FloatingDock';
import { useRotateEnter } from './rotateEnter';

// Màn hình ngang: chia đôi thành hai cột, MỖI CỘT CUỘN RIÊNG (cuộn bên này thì bên kia đứng yên), không hiện thanh cuộn.
// left / right: nội dung từng cột. ratio: bề rộng cột trái (0..1). pad: lề trong mỗi cột.
// leftFixed: cột trái không cuộn (vd. trang Profile có ảnh bìa cố định) — tự lo bố cục bên trong
// noEnter: không trượt vào chỗ sau khi xoay máy (Home tự làm theo từng khối)
export function SplitPane({
  left,
  right,
  ratio = 0.5,
  pad = 16,
  gap = 8,
  leftFixed,
  leftStyle,
  topExtra = 12,
  noEnter,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  ratio?: number;
  pad?: number;
  gap?: number;
  leftFixed?: boolean;
  leftStyle?: StyleProp<ViewStyle>;
  topExtra?: number;
  noEnter?: boolean;
}) {
  const insets = useContentInsets();
  // vừa xoay sang ngang: cột trái trượt vào từ trái, cột phải từ phải (trễ hơn một nhịp)
  const enter = useRotateEnter();
  const inL = noEnter ? undefined : enter(0, 'left');
  const inR = noEnter ? undefined : enter(1, 'right');
  const content = { paddingTop: insets.top + topExtra, paddingBottom: insets.bottom + insets.endPadding, paddingHorizontal: pad };
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap }}>
      {leftFixed ? (
        <Animated.View entering={inL} style={[{ flex: ratio }, leftStyle]}>{left}</Animated.View>
      ) : (
        <ScrollView style={[{ flex: ratio }, leftStyle]} contentContainerStyle={content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View entering={inL}>{left}</Animated.View>
        </ScrollView>
      )}
      <ScrollView style={{ flex: 1 - ratio }} contentContainerStyle={content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View entering={inR}>{right}</Animated.View>
      </ScrollView>
    </View>
  );
}
