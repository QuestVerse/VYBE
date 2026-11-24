
import React, { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { installAppLog, log, previousSession, setLogContext } from './src/data/applog';
import { reportPreviousRun } from './src/data/blackbox';
import { beginMotion, endMotion, JankMonitor, setPerfInfo, useRenderProbe } from './src/components/JankMonitor';
import { updateCoverTint } from './src/theme/coverTint';
import { LogScreen } from './src/screens/LogScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { AppleDock } from './src/components/AppleDock';
import { AppleDockLand } from './src/components/AppleDockLand';
import { ZyxDock } from './src/components/ZyxDock';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ActivityIndicator, Animated, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenSizeProvider } from './src/components/ScreenSize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DOCK_THICKNESS } from './src/components/layout';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { PlayerProvider, usePlayerPick } from './src/player/PlayerProvider';
import { FloatingDock, useContentInsets } from './src/components/FloatingDock';
import { MiniPlayer } from './src/components/MiniPlayer';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { NowPlayingScreen } from './src/screens/NowPlayingScreen';
import { ActionSheetProvider } from './src/components/ActionSheet';
import { Freeze } from './src/components/Freeze';
import { GenreScreen } from './src/screens/GenreScreen';
import { TabId } from './src/theme/types';
import { DropPreview } from './src/components/DropPreview';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { UserScreen } from './src/screens/UserScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { ComposerHost } from './src/components/PostComposer';
import { syncSharedPlaylists } from './src/data/sharedSync';
import { startBackup } from './src/data/backup';
import { useDbVersion } from './src/data/db';
import { useSession } from './src/data/auth';
import { PlayerTransition } from './src/components/PlayerTransition';
import { BackdropBlur } from './src/components/BackdropBlur';
import { NavProvider, Page, useNav, useNavStack } from './src/nav/Nav';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { ArtistScreen } from './src/screens/ArtistScreen';
import RAnimated, { cancelAnimation, Easing as REasing, makeMutable, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { GlassInside } from './src/components/Glass';
import { scheduleOnRN } from 'react-native-worklets';
import { AppBackground } from './src/components/AppBackground';
import { AmbientEffect } from './src/components/AmbientLayer';
import { musicSupported, ytmusic } from './src/music/lazy';
import { ThemeTransition } from './src/theme/ThemeTransition';
import { ThemeStudioScreen } from './src/screens/ThemeStudioScreen';
import { AppUpdater } from './src/components/AppUpdater';
import { UpdateNotice } from './src/components/UpdateNotice';
import { AuthGate } from './src/screens/AuthGate';

const HomeTab = React.memo(HomeScreen);
const NowPlayingMemo = React.memo(NowPlayingScreen);
const SearchTab = React.memo(SearchScreen);
const LibraryTab = React.memo(LibraryScreen);
const SettingsTab = React.memo(SettingsScreen);

ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch(() => {});

function Placeholder({ name }: { name: string }) {
  const { theme } = useTheme();
  const pad = useContentInsets();
  return (
    <View style={{ flex: 1, paddingTop: pad.top + 16, paddingLeft: pad.left + 16 }}>
      <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '700' }}>{name}</Text>
    </View>
  );
}

function pageKey(pg: Page, i: number) {
  if (pg.type === 'collection') return `${i}:col:${pg.source}:${pg.id}`;
  if (pg.type === 'artist') return `${i}:artist:${pg.id}`;
  if (pg.type === 'genre') return `${i}:genre:${pg.params}`;
  if (pg.type === 'user') return `${i}:user:${pg.id}`;
  return `${i}:${pg.type}`;
}

type PageTab = Exclude<TabId, 'player'>;
const TAB_ORDER: PageTab[] = ['home', 'search', 'library', 'settings'];
const TAB_SHIFT = 30;
const TAB_IN = { duration: 280, easing: REasing.out(REasing.cubic) };
const TAB_OUT = { duration: 200, easing: REasing.out(REasing.quad) };

function TabPane({ o, x, visible, active, pre, children }: { o: SharedValue<number>; x: SharedValue<number>; visible: boolean; active: boolean; pre?: boolean; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }] }));
  return (
    <RAnimated.View pointerEvents={active ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { display: visible ? 'flex' : 'none' }, style]}>
      <GlassInside>
        <Freeze freeze={!visible && !pre}>{children}</Freeze>
      </GlassInside>
    </RAnimated.View>
  );
}

function PageGlass({ children }: { children: React.ReactNode }) {
  return <GlassInside>{children}</GlassInside>;
}

function TabStage({ shown, render, pre }: { shown: PageTab; render: (id: PageTab) => React.ReactNode; pre?: PageTab | null }) {
  const sv = {
    home: { o: useSharedValue(shown === 'home' ? 1 : 0), x: useSharedValue(0) },
    search: { o: useSharedValue(shown === 'search' ? 1 : 0), x: useSharedValue(0) },
    library: { o: useSharedValue(shown === 'library' ? 1 : 0), x: useSharedValue(0) },
    settings: { o: useSharedValue(shown === 'settings' ? 1 : 0), x: useSharedValue(0) },
  };
  const [visible, setVisible] = useState<Set<PageTab>>(() => new Set([shown]));
  const shownRef = useRef(shown);
  const prev = useRef(shown);
  const hide = useCallback((id: PageTab) => {
    if (id === shownRef.current) return;
    setVisible((v) => {
      if (!v.has(id)) return v;
      const n = new Set(v);
      n.delete(id);
      return n;
    });
  }, []);

  useLayoutEffect(() => {
    shownRef.current = shown;
    const from = prev.current;
    prev.current = shown;
    if (from === shown) return;
    const dir = Math.sign(TAB_ORDER.indexOf(shown) - TAB_ORDER.indexOf(from)) || 1;
    const t = sv[shown];
    if (t.o.value < 0.01) t.x.value = dir * TAB_SHIFT;
    t.o.value = withTiming(1, TAB_IN);
    t.x.value = withTiming(0, TAB_IN);
    for (const id of TAB_ORDER) {
      if (id === shown) continue;
      const s = sv[id];
      if (s.o.value < 0.01) continue;
      s.x.value = withTiming(-dir * TAB_SHIFT, TAB_OUT);
      s.o.value = withTiming(0, TAB_OUT, (done) => {
        if (done) scheduleOnRN(hide, id);
      });
    }
    setVisible((v) => {
      const n = new Set(v);
      n.add(shown);
      return n;
    });
  }, [shown]);

  return (
    <>
      {TAB_ORDER.map((id) => {
        const el = render(id);
        if (!el) return null;
        return (
          <TabPane key={id} o={sv[id].o} x={sv[id].x} visible={visible.has(id)} active={id === shown} pre={pre === id}>
            {el}
          </TabPane>
        );
      })}
    </>
  );
}

function CoverTintSync() {
  const { theme } = useTheme();
  const { track } = usePlayerPick('track');
  const on = theme.preset === 'cover';
  useEffect(() => {
    if (on && track.id !== 'none') updateCoverTint(track.thumb);
  }, [on, track.id, track.thumb]);
  return null;
}

function Root() {
  const { theme, landscape } = useTheme();
  const [tab, setTab] = useState<TabId>('home');
  const [lastTab, setLastTab] = useState<TabId>('home');
  const [playerUp, setPlayerUp] = useState(false);
  useEffect(() => {
    if (tab === 'player') setPlayerUp(true);
    else setAmbientOff(false);
  }, [tab]);
  const [ambientOff, setAmbientOff] = useState(false);
  const navActions = useNav();
  const stack = useNavStack();
  const nav = { ...navActions, stack };
  const tabFade = useSharedValue(1);
  const depth = nav.stack.length;
  const pageFades = useRef(new Map<string, SharedValue<number>>()).current;
  const fadeOf = (k: string) => {
    let v = pageFades.get(k);
    if (!v) {
      v = makeMutable(1);
      pageFades.set(k, v);
    }
    return v;
  };
  useEffect(() => {
    const alive = new Set(nav.stack.map((pg, i) => pageKey(pg, i)));
    for (const k of [...pageFades.keys()]) if (!alive.has(k)) pageFades.delete(k);
  }, [nav.stack, pageFades]);
  useLayoutEffect(() => {
    if (depth === 0) {
      cancelAnimation(tabFade);
      tabFade.value = 1;
    }
  }, [depth, tabFade]);
  const go = (t: TabId) => {
    if (t !== 'player') {
      setLastTab(t);
      nav.reset();
    }
    setTab(t);
  };
  const page = nav.stack[nav.stack.length - 1];
  useEffect(() => {
    setLogContext(tab === 'player' ? 'player' : page ? `${tab} › ${page.type}${'title' in page ? ` "${page.title}"` : 'name' in page ? ` "${page.name}"` : ''}` : tab);
  }, [tab, page]);
  const prevTab = useRef(tab);
  useEffect(() => {
    const from = prevTab.current;
    prevTab.current = tab;
    if (from === tab || tab === 'player' || from === 'player') return;
    beginMotion('đổi tab', `${from} → ${tab}`);
    const id = setTimeout(() => endMotion(), 600);
    return () => clearTimeout(id);
  }, [tab]);
  useEffect(() => {
    const fx = theme.background.type !== 'preset' ? `nền ${theme.background.type}` : (theme.effects.ambient as Record<string, boolean>)[theme.preset] ? 'hiệu ứng bật' : 'hiệu ứng tắt';
    setPerfInfo(
      `theme ${theme.preset}${theme.preset === 'smoke' ? `/${theme.effects.smokeTone}` : ''} (${fx}${ambientOff ? ', đang tạm dừng' : ''}) · kính ${theme.glass.material} · player ${theme.player.look ?? 'classic'} · ${landscape ? 'ngang' : 'dọc'}`
    );
  }, [theme, ambientOff, landscape]);
  const shown = tab === 'player' ? lastTab : tab;
  const lastTabRef = useRef(lastTab);
  lastTabRef.current = lastTab;
  const closePlayer = useCallback(() => setTab(lastTabRef.current), []);
  useRenderProbe('khung app', { tab, lastTab, playerUp, ambientOff, stack: nav.stack, theme, landscape });
  const visited = useRef(new Set<TabId>()).current;
  visited.add(shown);
  const [preTab, setPreTab] = useState<PageTab | null>(null);
  useEffect(() => {
    let off = false;
    let timer: ReturnType<typeof setTimeout>;
    const ric = (cb: () => void) => {
      let done = false;
      const once = () => {
        if (done) return;
        done = true;
        cb();
      };
      const r = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
      if (r) r(once);
      setTimeout(once, r ? 1500 : 0);
    };
    const step = () => {
      if (off) return;
      const id = TAB_ORDER.find((t) => !visited.has(t));
      if (!id) {
        log('ui', 'dựng sẵn tab: xong, đóng băng lại');
        setPreTab(null);
        return;
      }
      visited.add(id);
      log('ui', `dựng sẵn tab: ${id}`);
      startTransition(() => setPreTab(id));
      timer = setTimeout(() => ric(step), 1000);
    };
    timer = setTimeout(() => ric(step), 4000);
    return () => {
      off = true;
      clearTimeout(timer);
    };
  }, []);
  const tabEl = (id: PageTab) =>
    !visited.has(id) ? null : id === 'home' ? <HomeTab /> : id === 'search' ? <SearchTab /> : id === 'library' ? <LibraryTab /> : <SettingsTab />;

  return (
    <ActionSheetProvider closePlayer={() => tab === 'player' && setTab(lastTab)}>
    <View style={{ flex: 1, backgroundColor: theme.background.color }}>
      <StatusBar barStyle={theme.colors.statusBar} />
      <AppBackground />
      <AmbientEffect paused={ambientOff} />
      {Platform.OS !== 'web' && <JankMonitor />}
      <CoverTintSync />
      <UpdateNotice />
      <View style={{ flex: 1 }}>
        <ContentArea>
        <FadeLayer value={tabFade} pointerEvents={page ? 'none' : 'auto'} style={{ flex: 1 }}>
          <TabStage shown={shown as PageTab} render={tabEl} pre={preTab} />
        </FadeLayer>
        {nav.stack.map((pg, i) => {
          const k = pageKey(pg, i);
          const top = i === nav.stack.length - 1;
          return (
            <FadeLayer key={k} value={fadeOf(k)} pointerEvents={top ? 'box-none' : 'none'} style={StyleSheet.absoluteFill}>
              <PageGlass>
              <Freeze freeze={i < nav.stack.length - 2}>
              <SwipeBack onBack={nav.pop} fade={i === 0 ? tabFade : fadeOf(pageKey(nav.stack[i - 1], i - 1))}>
                {pg.type === 'collection' ? (
                  <CollectionScreen page={pg} />
                ) : pg.type === 'artist' ? (
                  <ArtistScreen page={pg} />
                ) : pg.type === 'genre' ? (
                  <GenreScreen page={pg} />
                ) : pg.type === 'user' ? (
                  <UserScreen page={pg} />
                ) : pg.type === 'feed' ? (
                  <FeedScreen />
                ) : pg.type === 'log' ? (
                  <LogScreen day={pg.day} />
                ) : pg.type === 'stats' ? (
                  <StatsScreen />
                ) : (
                  <ThemeStudioScreen />
                )}
              </SwipeBack>
              </Freeze>
              </PageGlass>
            </FadeLayer>
          );
        })}
        </ContentArea>
        <DropPreview />
        <ComposerHost />
        <SharedSyncer />
        <BackdropBlur />
        <OfflineBanner />
        {!(theme.dock.mode === 'apple' || theme.dock.mode === 'zyx') && <MiniPlayer hidden={tab === 'player' || playerUp} onOpen={() => setTab('player')} />}
          {theme.dock.mode === 'apple' && !landscape ? (
            <AppleDock active={tab} onChange={go} onOpenPlayer={() => setTab('player')} hidden={tab === 'player' || playerUp} />
          ) : theme.dock.mode === 'apple' ? (
            <AppleDockLand active={tab} onChange={go} onOpenPlayer={() => setTab('player')} hidden={tab === 'player' || playerUp} />
          ) : theme.dock.mode === 'zyx' && !landscape ? (
            <ZyxDock active={tab} onChange={go} onOpenPlayer={() => setTab('player')} hidden={tab === 'player' || playerUp} />
          ) : theme.dock.mode === 'zyx' ? (
            <AppleDockLand square active={tab} onChange={go} onOpenPlayer={() => setTab('player')} hidden={tab === 'player' || playerUp} />
          ) : (
            <FloatingDock active={tab} onChange={go} hidden={tab === 'player'} />
          )}
          <PlayerTransition open={tab === 'player'} onReopen={() => setTab('player')} onClose={() => setTab(lastTab)} onClosed={() => setPlayerUp(false)} onOpened={() => setAmbientOff(true)}>
          <NowPlayingMemo onClose={closePlayer} />
        </PlayerTransition>
      </View>
    </View>
    </ActionSheetProvider>
  );
}

function ContentArea({ children }: { children: React.ReactNode }) {
  const { theme, landscape } = useTheme();
  const insets = useSafeAreaInsets();
  const side = landscape;
  const padL = landscape ? insets.left : 0;
  const padR = landscape ? insets.right + (side ? DOCK_THICKNESS + theme.dock.style.margin * 2 : 0) : 0;
  return (
    <View style={{ flex: 1, paddingLeft: padL, paddingRight: padR }}>
      <ScreenSizeProvider>{children}</ScreenSizeProvider>
    </View>
  );
}

function SharedSyncer() {
  const dbv = useDbVersion();
  const session = useSession();
  const acc = session?.mode === 'account' ? session.id : undefined;
  useEffect(() => {
    startBackup(acc ?? null);
  }, [acc]);
  useEffect(() => {
    if (!acc) return;
    const id = setTimeout(syncSharedPlaylists, 2500);
    return () => clearTimeout(id);
  }, [dbv, acc]);
  return null;
}

const BOOT_MAX_MS = 2500;
function Boot({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [ready, setReady] = useState(!musicSupported);
  useEffect(() => {
    if (ready) return;
    let done = false;
    const t0 = Date.now();
    const parts: string[] = [];
    const finish = (why: string) => {
      if (done) return;
      done = true;
      setReady(true);
      const shownAt = Date.now() - t0;
      setTimeout(() => {
        const idle: (cb: () => void) => void = (globalThis as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 0));
        idle(() => {
          const s0 = Date.now();
          try {
            ytmusic()
              .getSession()
              .catch(() => {})
              .finally(() => log('ui', `khởi động: ${parts.join(', ')}; vào app sau ${shownAt}ms (${why}); phiên phát nhạc ${Date.now() - s0}ms (chạy nền sau khi vào app)`));
          } catch {}
        });
      }, 1200);
    };
    const cap = setTimeout(() => finish('hết giờ chờ'), BOOT_MAX_MS);
    const id = setTimeout(() => {
      try {
        const r0 = Date.now();
        const yt = ytmusic();
        parts.push(`nạp youtubei ${Date.now() - r0}ms`);
        const b0 = Date.now();
        yt.getBrowseSession()
          .then(() => parts.push(`phiên duyệt ${Date.now() - b0}ms`))
          .catch(() => parts.push('phiên duyệt lỗi'))
          .finally(() => finish('đủ để hiện Home'));
      } catch (e) {
        console.warn('[boot] preload', e);
        finish('lỗi nạp');
      }
    }, 16);
    return () => {
      clearTimeout(id);
      clearTimeout(cap);
    };
  }, [ready]);
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background.color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.colors.text, fontSize: 44, fontWeight: '900', letterSpacing: 6 }}>VYBE</Text>
        <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 18 }} />
      </View>
    );
  }
  return <>{children}</>;
}

installAppLog();
setTimeout(() => void reportPreviousRun(previousSession), 4000);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ScreenSizeProvider>
        <ThemeProvider>
          <PlayerProvider>
            <NavProvider>
              <Boot>
                <AppUpdater />
                <AuthGate>
                  <ThemeTransition>
                    <Root />
                  </ThemeTransition>
                </AuthGate>
              </Boot>
            </NavProvider>
          </PlayerProvider>
        </ThemeProvider>
        </ScreenSizeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
