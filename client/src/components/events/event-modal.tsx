// Event detail MODAL (phase 2). Rendered by the events page only while open, so
// its mount/unmount cleanly drives the web a11y lifecycle (scroll lock, focus
// trap, return focus). Composed from small sub-components (countdown, launch
// details, score gauge) so a future detail page can reuse the pieces.

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EventCountdown } from '@/components/events/event-countdown';
import { LaunchDetailsSection } from '@/components/events/launch-details';
import { ScoreGauge } from '@/components/events/score-gauge';
import { fallbackIconSource } from '@/components/events/event-fallback-icon';
import { formatEventDate } from '@/components/events/event-card';
import { Palette, Radius, alpha } from '@/constants/tokens';
import {
  checkEventSaved,
  deleteUserEvent,
  fetchViewingScore,
  saveUserEvent,
  type EventListItem,
} from '@/lib/events-api';
import { describeVisibility } from '@/lib/event-visibility';

const LAUNCH_ACCENT = Palette.accentRed;
const EVENT_ACCENT = Palette.accent;

function openUrl(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(url).catch(() => {});
  }
}

export function EventModal({
  event,
  onClose,
  userId,
  userLat,
  userLon,
}: {
  event: EventListItem;
  onClose: () => void;
  userId: number | null;
  userLat: number | null;
  userLon: number | null;
}) {
  const isLaunch = event.category === 'launch';
  const accent = isLaunch ? LAUNCH_ACCENT : EVENT_ACCENT;
  const fallbackIcon = fallbackIconSource(event);
  const { visible, tooFar, distanceMiles } = describeVisibility(event, userLat, userLon);
  const hasWebcast = Boolean(event.video_url) || event.webcast_live;

  const contentRef = useRef<View>(null);

  // --- viewing score ---
  const [score, setScore] = useState<number | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  // --- saved state ---
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // --- enter animation (fade + scale) ---
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [anim]);

  // --- web a11y: scroll lock, Escape, focus trap, return focus, aria ---
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const trigger = document.activeElement as HTMLElement | null;
    const node = contentRef.current as unknown as HTMLElement | null;

    document.body.style.overflow = 'hidden';
    if (node) {
      node.setAttribute('role', 'dialog');
      node.setAttribute('aria-modal', 'true');
      node.setAttribute('aria-label', event.name);
      node.setAttribute('tabindex', '-1');
      node.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && node) {
        const focusables = Array.from(
          node.querySelectorAll<HTMLElement>(
            'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      trigger?.focus?.();
    };
  }, [event.name, onClose]);

  // --- fetch viewing score for the user's location (only if visible) ---
  useEffect(() => {
    if (!visible || userLat == null || userLon == null) return;
    const controller = new AbortController();
    setScoreLoading(true);
    fetchViewingScore(userLat, userLon, controller.signal)
      .then((r) => setScore(r.viewing_score))
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setScore(null);
      })
      .finally(() => setScoreLoading(false));
    return () => controller.abort();
  }, [visible, userLat, userLon]);

  // --- seed saved state ---
  useEffect(() => {
    if (userId == null) return;
    const controller = new AbortController();
    checkEventSaved(userId, event.event_id, controller.signal)
      .then((r) => {
        setSaved(r.saved);
        setSavedId(r.user_event_id);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [userId, event.event_id]);

  async function handleSaveToggle() {
    if (userId == null || saveBusy) return;
    setSaveError(null);

    if (!saved) {
      // Optimistic save.
      setSaved(true);
      setSaveBusy(true);
      try {
        const res = await saveUserEvent(userId, event.event_id);
        setSavedId(res.user_event_id);
      } catch {
        setSaved(false); // rollback
        setSaveError('Could not save. Try again.');
      } finally {
        setSaveBusy(false);
      }
    } else {
      // Optimistic unsave.
      const prevId = savedId;
      setSaved(false);
      setSaveBusy(true);
      try {
        if (prevId) await deleteUserEvent(prevId);
        setSavedId(null);
      } catch {
        setSaved(true); // rollback
        setSaveError('Could not remove. Try again.');
      } finally {
        setSaveBusy(false);
      }
    }
  }

  const cardAnimStyle = {
    opacity: anim,
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
  };

  return (
    <View style={[styles.root, Platform.OS === 'web' && ({ position: 'fixed' } as object)]}>
      {/* Backdrop — click to close. */}
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} aria-label="Close dialog" />
      </Animated.View>

      {/* Centering layer (also closes on outside click). */}
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={[styles.card, cardAnimStyle]}>
          {/* The dialog surface. contentRef gets role/aria/focus in the effect. */}
          <View ref={contentRef} style={styles.dialog}>
            {/* Close button */}
            <Pressable style={styles.closeBtn} onPress={onClose} aria-label="Close">
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {/* Enlarged image / fallback */}
              <View style={[styles.hero, isLaunch && { borderColor: LAUNCH_ACCENT + '55' }]}>
                {event.image_url ? (
                  <Image source={{ uri: event.image_url }} style={styles.heroImage} resizeMode="cover" />
                ) : fallbackIcon ? (
                  <View style={styles.heroFallback}>
                    <Image source={fallbackIcon} style={styles.heroFallbackImage} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={styles.heroFallback}>
                    <Text style={styles.heroFallbackIcon}>{isLaunch ? '🚀' : '✨'}</Text>
                  </View>
                )}
              </View>

              {/* Type badge */}
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: accent + '20' }]}>
                  <Text style={[styles.badgeText, { color: accent }]}>
                    {isLaunch ? '🚀 LAUNCH' : event.type.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.title}>{event.name}</Text>

              {/* Date + countdown */}
              <Text style={styles.date}>{formatEventDate(event.date, event.date_precision)}</Text>
              <EventCountdown date={event.date} />

              {/* Location */}
              {event.location ? (
                <Text style={styles.location}>📍 {event.location}</Text>
              ) : null}

              {/* Viewing score — or, if the event is too far, a 0 + gentle note */}
              {tooFar ? (
                <View style={styles.gaugeWrap}>
                  <ScoreGauge score={0} />
                  <Text style={styles.note}>
                    You're about {distanceMiles} mi from this one, a little too far to catch it
                    in person.{' '}
                    {event.video_url
                      ? 'Tune into the live stream below to enjoy it live! 🚀'
                      : "But keep an eye out, there's always the next one. 🔭"}
                  </Text>
                </View>
              ) : userLat == null || userLon == null ? (
                <Text style={styles.note}>Enable location to see your viewing score.</Text>
              ) : scoreLoading ? (
                <View style={styles.scoreLoading}>
                  <ActivityIndicator color={Palette.accent} />
                </View>
              ) : score != null ? (
                <View style={styles.gaugeWrap}>
                  <ScoreGauge score={score} />
                </View>
              ) : (
                <Text style={styles.note}>Viewing score unavailable right now.</Text>
              )}

              {/* Full description */}
              {event.description ? (
                <Text style={styles.description}>{event.description}</Text>
              ) : null}

              {/* Launch details */}
              {isLaunch && event.launch_details ? (
                <LaunchDetailsSection details={event.launch_details} />
              ) : null}

              {/* Webcast */}
              {hasWebcast ? (
                event.video_url ? (
                  <Pressable style={styles.watchBtn} onPress={() => openUrl(event.video_url!)}>
                    <Text style={styles.watchBtnText}>▶  Watch live</Text>
                  </Pressable>
                ) : (
                  <View style={styles.liveTag}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live coverage expected</Text>
                  </View>
                )
              ) : null}

              {/* Save event */}
              <Pressable
                style={[
                  styles.saveBtn,
                  saved && styles.saveBtnSaved,
                  (userId == null || saveBusy) && styles.saveBtnDisabled,
                ]}
                onPress={handleSaveToggle}
                disabled={userId == null || saveBusy}
                aria-label={saved ? 'Remove saved event' : 'Save event'}>
                <Text style={[styles.saveBtnText, saved && styles.saveBtnTextSaved]}>
                  {userId == null ? 'Log in to save' : saved ? '✓ Saved' : 'Save event'}
                </Text>
              </Pressable>
              {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', // overridden to 'fixed' inline on web
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha(Palette.bgVoid, 0.72),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
  },
  dialog: {
    // flex:1 + minHeight:0 lets the dialog fill the card UP TO its maxHeight and
    // clip, which is what gives the inner ScrollView a bounded height to scroll
    // within. Without this the content just overflows and can't be reached.
    flex: 1,
    minHeight: 0,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    // RN shadow props; react-native-web maps these to box-shadow on web.
    shadowColor: Palette.shadow,
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 5,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(Palette.bgDeep, 0.6),
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  closeIcon: {
    fontSize: 15,
    color: Palette.textSecondary,
    fontWeight: '700',
    lineHeight: 18,
  },
  scroll: {
    // Fill the bounded dialog and scroll when content exceeds it. minHeight:0 is
    // required on web so this flex item can shrink below its content height.
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  hero: {
    height: 200,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Palette.bgDeep,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallbackIcon: {
    fontSize: 56,
    opacity: 0.7,
  },
  heroFallbackImage: {
    width: 104,
    height: 104,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.accent,
  },
  location: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  note: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    fontStyle: 'italic',
    backgroundColor: Palette.bgDeep,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  scoreLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  gaugeWrap: {
    alignItems: 'center',
    paddingVertical: 4,
    gap: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: Palette.textSecondary,
  },
  watchBtn: {
    backgroundColor: Palette.accentRed,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  watchBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.accentRed,
  },
  liveText: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  saveBtn: {
    borderWidth: 1,
    borderColor: Palette.accent,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: Palette.accent + '14',
  },
  saveBtnSaved: {
    backgroundColor: Palette.accentGreen + '1A',
    borderColor: Palette.accentGreen,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.accent,
  },
  saveBtnTextSaved: {
    color: Palette.accentGreen,
  },
  saveError: {
    fontSize: 12,
    color: Palette.accentRed,
    textAlign: 'center',
  },
});
