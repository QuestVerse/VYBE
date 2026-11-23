import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useT } from '../i18n';
import { dayOf, getDayLines, type DayMeta } from '../data/applog';

// Settings › Log overview: the days that have a log, as a list (A) or a month calendar (B).
const CRASH = '#E5484D';
const ERROR = '#F5A524';

// Two-way switch (List | Calendar) at the top right of the Log screen
export function ViewToggle({ value, onChange }: { value: 'list' | 'calendar'; onChange: (v: 'list' | 'calendar') => void }) {
  const { theme } = useTheme();
  const { surface, border, accent, onAccent, text } = theme.colors;
  const t = useT();
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: withTiming(value === 'list' ? 0 : 44, { duration: 180 }) }] }));
  const Seg = ({ v, icon, label }: { v: 'list' | 'calendar'; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) => (
    <Pressable onPress={() => onChange(v)} style={styles.seg} accessibilityRole="button" accessibilityState={{ selected: value === v }} accessibilityLabel={label}>
      <Ionicons name={icon} size={18} color={value === v ? onAccent : text} />
    </Pressable>
  );
  return (
    <View style={[styles.toggle, { backgroundColor: surface, borderColor: border }]}>
      <Animated.View style={[styles.knob, { backgroundColor: accent }, knob]} />
      <Seg v="list" icon="list" label={t('log.viewList')} />
      <Seg v="calendar" icon="calendar-outline" label={t('log.viewCal')} />
    </View>
  );
}

function Badges({ m }: { m: DayMeta }) {
  const t = useT();
  const { theme } = useTheme();
  const { textSecondary, border } = theme.colors;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {m.crashes > 0 && <Text style={[styles.badge, { color: CRASH, borderColor: CRASH }]}>{t('log.crashes', { n: m.crashes })}</Text>}
      {m.errors > 0 && <Text style={[styles.badge, { color: ERROR, borderColor: ERROR }]}>{t('log.errors', { n: m.errors })}</Text>}
      {m.jank > 0 && <Text style={[styles.badge, { color: textSecondary, borderColor: border }]}>{t('log.jank', { n: m.jank })}</Text>}
      <Text style={[styles.badge, { color: textSecondary, borderColor: border }]}>{t('log.lines', { n: m.lines })}</Text>
    </View>
  );
}

type Props = { days: DayMeta[]; label: (day: string) => string; onOpen: (day: string) => void; onSend: (m: DayMeta) => void };

// A · one card per day
export function LogDayList({ days, label, onOpen, onSend }: Props) {
  const { theme } = useTheme();
  const { text, textSecondary, surface, border } = theme.colors;
  const t = useT();
  const recentCrash = days.find((d) => d.crashes > 0 && d.day >= dayOf(Date.now() - 86400000));
  if (!days.length) return <Text style={{ color: textSecondary, textAlign: 'center', marginTop: 40 }}>{t('log.empty')}</Text>;
  return (
    <View style={{ gap: 10 }}>
      {recentCrash && (
        <Pressable onPress={() => onOpen(recentCrash.day)} style={[styles.banner, { borderColor: CRASH }]}>
          <Ionicons name="warning-outline" size={20} color={CRASH} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: text, fontWeight: '700', fontSize: 14 }}>{t('log.crashBanner', { day: label(recentCrash.day) })}</Text>
            <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>{t('log.crashBannerSub')}</Text>
          </View>
        </Pressable>
      )}
      {days.map((m) => (
        <Pressable key={m.day} onPress={() => onOpen(m.day)} style={[styles.card, { backgroundColor: surface, borderColor: m.crashes ? CRASH : border }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: text, fontWeight: '700', fontSize: 16 }}>{label(m.day)}</Text>
            <Badges m={m} />
          </View>
          <Pressable onPress={() => onSend(m)} hitSlop={6} style={[styles.sendBtn, { borderColor: border }]} accessibilityLabel={t('log.share')}>
            <Ionicons name="share-outline" size={20} color={text} />
          </Pressable>
          <Ionicons name="chevron-forward" size={18} color={textSecondary} />
        </Pressable>
      ))}
    </View>
  );
}

// B · month calendar with a dot per day (red = crash, orange = errors, grey = normal)
export function LogCalendar({ days, label, onOpen, onSend }: Props) {
  const { theme } = useTheme();
  const { text, textSecondary, surface, border, accent, onAccent } = theme.colors;
  const t = useT();
  const byDay = useMemo(() => new Map(days.map((d) => [d.day, d])), [days]);
  const today = dayOf(Date.now());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [picked, setPicked] = useState<string>(days[0]?.day ?? today);
  const pickedMeta = byDay.get(picked);
  const lang = theme.language === 'vi' ? 'vi-VN' : 'en-US';
  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleDateString(lang, { month: 'long', year: 'numeric' });
  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const count = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + count) / 7) * 7 }, (_, i) => {
    const n = i - lead + 1;
    if (n < 1 || n > count) return null;
    return dayOf(new Date(cursor.y, cursor.m, n).getTime());
  });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(lang, { weekday: 'narrow' }));
  const shift = (k: number) => setCursor((c) => {
    const d = new Date(c.y, c.m + k, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const preview = useMemo(() => (pickedMeta ? getDayLines(picked).slice(-3).reverse() : []), [picked, pickedMeta?.lines]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.calBox, { backgroundColor: surface, borderColor: border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => shift(-1)} hitSlop={8} style={styles.navBtn} accessibilityLabel={t('log.prevMonth')}>
            <Ionicons name="chevron-back" size={20} color={text} />
          </Pressable>
          <Text style={{ color: text, fontWeight: '700', fontSize: 16, textTransform: 'capitalize' }}>{monthName}</Text>
          <Pressable onPress={() => shift(1)} hitSlop={8} style={styles.navBtn} accessibilityLabel={t('log.nextMonth')}>
            <Ionicons name="chevron-forward" size={20} color={text} />
          </Pressable>
        </View>
        <View style={styles.grid}>
          {weekdays.map((w, i) => (
            <Text key={`w${i}`} style={[styles.cell, { color: textSecondary, fontSize: 11, fontWeight: '600', height: 22 }]}>{w}</Text>
          ))}
          {cells.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={styles.cell} />;
            const m = byDay.get(d);
            const sel = d === picked;
            const dot = m ? (m.crashes ? CRASH : m.errors ? ERROR : textSecondary) : 'transparent';
            return (
              <Pressable key={d} onPress={() => setPicked(d)} style={[styles.cell, sel && { backgroundColor: accent, borderRadius: 12 }, d === today && !sel && { borderWidth: 1, borderColor: border, borderRadius: 12 }]}>
                <Text style={{ color: sel ? onAccent : d > today ? textSecondary : text, fontWeight: sel || d === today ? '800' : '500', fontSize: 14 }}>{Number(d.slice(8))}</Text>
                <View style={[styles.dot, { backgroundColor: sel && m ? onAccent : dot }]} />
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 8 }}>
          {[[CRASH, t('log.legendCrash')], [ERROR, t('log.legendErrors')], [textSecondary, t('log.legendNormal')]].map(([c, l]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={[styles.dot, { backgroundColor: c }]} />
              <Text style={{ color: textSecondary, fontSize: 11 }}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.calBox, { backgroundColor: surface, borderColor: pickedMeta?.crashes ? CRASH : border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: text, fontWeight: '800', fontSize: 17 }}>{label(picked)}</Text>
            {pickedMeta ? <Badges m={pickedMeta} /> : <Text style={{ color: textSecondary, marginTop: 6 }}>{t('log.noLogDay')}</Text>}
          </View>
          {pickedMeta && (
            <Pressable onPress={() => onSend(pickedMeta)} hitSlop={6} style={[styles.sendBtn, { borderColor: border }]} accessibilityLabel={t('log.share')}>
              <Ionicons name="share-outline" size={20} color={text} />
            </Pressable>
          )}
        </View>
        {preview.length > 0 && (
          <View style={[styles.preview, { borderColor: border }]}>
            {preview.map((l, i) => (
              <Text key={i} numberOfLines={1} style={{ color: l.tag === 'error' ? CRASH : textSecondary, fontSize: 11, fontVariant: ['tabular-nums'] }}>
                {new Date(l.t).toTimeString().slice(0, 8)} [{l.tag}] {l.msg}
              </Text>
            ))}
          </View>
        )}
        {pickedMeta && (
          <Pressable onPress={() => onOpen(picked)} style={[styles.openBtn, { backgroundColor: accent }]}>
            <Text style={{ color: onAccent, fontWeight: '800', fontSize: 15 }}>{t('log.open')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', height: 38, width: 90, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth, padding: 2, alignItems: 'center' },
  knob: { position: 'absolute', left: 2, top: 2, width: 42, height: 32, borderRadius: 16 },
  seg: { width: 44, height: 34, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(229,72,77,0.12)' },
  sendBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  calBox: { padding: 14, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center', gap: 3, textAlign: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  preview: { marginTop: 12, padding: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  openBtn: { marginTop: 12, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
