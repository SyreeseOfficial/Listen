import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Dimensions, KeyboardAvoidingView, Platform, Alert, Modal, Animated, Switch,
} from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { getProfile, updateProfile, getSessions } from '../../utils/storage';
import { setHapticsEnabled } from '../../utils/haptics';
import * as Haptics from '../../utils/haptics';
import { scheduleDailyReminder, scheduleWeeklyRecap, cancelAllListenNotifications } from '../../utils/notifications';
import { computeStats } from '../../utils/stats';
import {
  getLevelInfo, calcEquipmentXp, totalXp, checkAchievements, getNearMissAchievements,
} from '../../utils/xp';
import { ACHIEVEMENTS } from '../../constants/achievements';
import { getCurrentWeekBadge, checkWeeklyBadge } from '../../constants/timeBadges';
import XpToast from '../../components/XpToast';

const { height, width } = Dimensions.get('window');
// 3 columns, 2 gaps of 10, 48px horizontal padding
const TILE = (width - 48 - 20) / 3;
const CATEGORIES = ['Headphones', 'Earbuds', 'IEMs', 'DAC', 'Amp', 'Speaker', 'Other'];
const DEFAULT_SHOW = 9;
const DEFAULT_EQUIPMENT_SHOW = 5;

const THEME_OPTIONS = [
  { label: 'Light', value: 'light' as const },
  { label: 'Dark', value: 'dark' as const },
  { label: 'System', value: 'system' as const },
];

export default function ProfileScreen() {
  const { colors, pref, setPref } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [category, setCategory] = useState('Headphones');
  const [inputValue, setInputValue] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastXp, setToastXp] = useState(0);
  const [nearMiss, setNearMiss] = useState<ReturnType<typeof getNearMissAchievements>>([]);
  const [weeklyBadgeId, setWeeklyBadgeId] = useState('');
  const [sunkCost, setSunkCost] = useState('');
  const [totalSessions, setTotalSessions] = useState(0);
  const [achExpanded, setAchExpanded] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [defaultMins, setDefaultMins] = useState(30);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [weekStart, setWeekStart] = useState<'monday' | 'sunday'>('monday');
  const [equipmentExpanded, setEquipmentExpanded] = useState(false);
  const [notifHour, setNotifHour] = useState(20);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [autoCompleteOn, setAutoCompleteOn] = useState(true);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [editGearIdx, setEditGearIdx] = useState<number | null>(null);
  const router = useRouter();
  const [editGearVal, setEditGearVal] = useState('');

  // Animated XP bar
  const animatedBar = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const levelInfo = getLevelInfo(profile?.xp ?? 0);

  useEffect(() => {
    if (trackWidth <= 0) return;
    Animated.spring(animatedBar, {
      toValue: levelInfo.progress * trackWidth,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [levelInfo.progress, trackWidth]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [p, s] = await Promise.all([getProfile(), getSessions()]);
        setProfile(p);
        setEditName(p?.name ?? '');
        setDefaultMins(p?.defaultSessionMinutes ?? 30);
        setHapticsOn(p?.hapticsEnabled ?? true);
        setWeekStart(p?.weekStartsOn ?? 'monday');
        setNotifHour(p?.notificationHour ?? 20);
        setNotifEnabled(p?.notificationsEnabled ?? false);
        setAutoCompleteOn(p?.autoComplete ?? true);
        setIsPremiumUser(p?.isPremium ?? false);

        if (p && s) {
          const stats = computeStats(s, p.streakShields ?? 0);
          const newAch = checkAchievements(s, p, stats);

          const { badge, weekId } = getCurrentWeekBadge();
          setWeeklyBadgeId(weekId);
          const weeklyNew = checkWeeklyBadge(badge, s, stats) && !(p.achievements ?? []).includes(weekId);
          if (weeklyNew) {
            newAch.push({ id: weekId, title: badge.title, description: badge.description, icon: badge.icon, xpReward: badge.xpReward });
          }

          if (newAch.length > 0) {
            const achXp = newAch.reduce((sum: number, a: any) => sum + a.xpReward, 0);
            await updateProfile({
              xp: (p.xp ?? 0) + achXp,
              achievements: [...(p.achievements ?? []), ...newAch.map((a: any) => a.id)],
            });
            setToastXp(achXp);
            setToastVisible(true);
          }

          setNearMiss(getNearMissAchievements(s, p as any, stats));

          const h = Math.floor(stats.totalSeconds / 3600);
          const m = Math.floor((stats.totalSeconds % 3600) / 60);
          setSunkCost(h > 0 ? `${h}h ${m}m` : `${m}m`);
          setTotalSessions(stats.sessionsCompleted);
        }
      }
      load();
    }, [])
  );

  const equipment: string[] = profile?.equipment ?? [];
  const unlockedSet = new Set<string>(profile?.achievements ?? []);
  const visibleAch = achExpanded ? ACHIEVEMENTS : ACHIEVEMENTS.slice(0, DEFAULT_SHOW);
  const isLevelCapped = !isPremiumUser && levelInfo.level >= 4;
  const displayLevel = isLevelCapped ? 3 : levelInfo.level;

  async function addGear() {
    if (!inputValue.trim()) return;
    if (!isPremiumUser && equipment.length >= 3) {
      router.push('/paywall');
      return;
    }
    Haptics.impact();
    const item = `${category}: ${inputValue.trim()}`;
    const next = [...equipment, item];
    await updateProfile({ equipment: next });
    setProfile((p: any) => ({ ...p, equipment: next }));

    const xp = totalXp(calcEquipmentXp(1));
    if (xp > 0) {
      const p = await getProfile();
      const newXp = (p?.xp ?? 0) + xp;
      await updateProfile({ xp: newXp });
      // Update local state immediately so bar animates
      setProfile((prev: any) => ({ ...prev, xp: newXp }));
      setToastXp(xp);
      setToastVisible(true);
    }
    setInputValue('');
  }

  async function removeGear(item: string) {
    Haptics.impact();
    const next = equipment.filter((g) => g !== item);
    await updateProfile({ equipment: next });
    setProfile((p: any) => ({ ...p, equipment: next }));
  }

  async function saveGearEdit() {
    if (editGearIdx === null || !editGearVal.trim()) return;
    const item = equipment[editGearIdx];
    const cat = item.includes(': ') ? item.split(': ')[0] : 'Other';
    const newItem = `${cat}: ${editGearVal.trim()}`;
    const next = equipment.map((g, i) => (i === editGearIdx ? newItem : g));
    await updateProfile({ equipment: next });
    setProfile((p: any) => ({ ...p, equipment: next }));
    setEditGearIdx(null);
  }

  async function saveName() {
    const trimmed = editName.trim();
    await updateProfile({ name: trimmed });
    setProfile((p: any) => ({ ...p, name: trimmed }));
    setSettingsVisible(false);
  }

  function resetProgress() {
    Alert.alert(
      'Reset Progress',
      'Erases all XP, levels, achievements, and streaks. Session history is kept. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive',
          onPress: async () => {
            await updateProfile({ xp: 0, achievements: [], streakShields: 0, lastShieldStreak: 0 });
            const fresh = await getProfile();
            setProfile(fresh);
            setSettingsVisible(false);
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Level card */}
        <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.levelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>LEVEL {displayLevel}{isLevelCapped ? ' 🔒' : ''}</Text>
              <Text style={[styles.levelTitle, { color: colors.text }]}>{isLevelCapped ? 'Level Cap Reached' : levelInfo.title}</Text>
              {profile?.name ? <Text style={[styles.profileName, { color: colors.textSecondary }]}>{profile.name}</Text> : null}
              {isLevelCapped && (
                <Pressable onPress={() => router.push('/paywall')} hitSlop={8}>
                  <Text style={[styles.profileName, { color: colors.accent }]}>Unlock Level 4+ →</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.levelRight}>
              <Pressable onPress={() => isLevelCapped && router.push('/paywall')} disabled={!isLevelCapped}>
                <Text style={[styles.levelBadge, { color: colors.accent, borderColor: colors.accent }]}>
                  {isLevelCapped ? '🔒' : levelInfo.level}
                </Text>
              </Pressable>
              <Pressable onPress={() => setSettingsVisible(true)} hitSlop={10}>
                <Text style={[styles.settingsIcon, { color: colors.textSecondary }]}>⚙</Text>
              </Pressable>
            </View>
          </View>

          {/* Animated XP bar */}
          <View
            style={[styles.xpBarTrack, { backgroundColor: colors.border }]}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          >
            <Animated.View style={[styles.xpBarFill, { backgroundColor: colors.accent, width: animatedBar }]} />
          </View>
          <View style={styles.xpRow}>
            <Text style={[styles.xpText, { color: colors.textSecondary }]}>
              {levelInfo.nextLevelXp
                ? `${levelInfo.currentXp} / ${levelInfo.nextLevelXp} XP`
                : `${profile?.xp ?? 0} XP · Max Level`}
            </Text>
            {levelInfo.nextLevelXp && (
              <Text style={[styles.xpText, { color: colors.accent }]}>
                {levelInfo.nextLevelXp - levelInfo.currentXp} to go
              </Text>
            )}
          </View>
          {sunkCost ? (
            <Text style={[styles.sunkCost, { color: colors.textSecondary }]}>
              {sunkCost} invested · {totalSessions} session{totalSessions !== 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>

        {/* Gear */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Gear</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.chip, {
                backgroundColor: category === cat ? colors.accent : colors.card,
                borderColor: category === cat ? colors.accent : colors.border,
              }]}
              onPress={() => setCategory(cat)}
            >
              <Text style={{ color: category === cat ? '#FFF' : colors.text, fontWeight: '500', fontSize: 13 }}>{cat}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            placeholder="e.g. Sony WH-1000XM5"
            placeholderTextColor={colors.textSecondary}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={addGear}
            returnKeyType="done"
          />
          <Pressable style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={addGear}>
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {!isPremiumUser && equipment.length >= 3 && (
          <Pressable onPress={() => router.push('/paywall')} hitSlop={8} style={{ marginBottom: 12, marginTop: -4 }}>
            <Text style={{ color: colors.accent, fontSize: 13 }}>🔒 Gear limit reached — upgrade for unlimited →</Text>
          </Pressable>
        )}

        {equipment.length > 0 ? (
          <>
            <View style={[styles.gearList, equipment.length > DEFAULT_EQUIPMENT_SHOW && { marginBottom: 10 }]}>
              {(equipmentExpanded ? equipment : equipment.slice(0, DEFAULT_EQUIPMENT_SHOW)).map((item, i) => {
                const parts = item.includes(': ') ? item.split(': ') : ['Other', item];
                const isEditing = editGearIdx === i;
                return (
                  <View
                    key={i}
                    style={[styles.gearRow, {
                      backgroundColor: colors.card,
                      borderColor: isEditing ? colors.accent : colors.border,
                    }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gearCat, { color: colors.accent }]}>{parts[0]}</Text>
                      {isEditing ? (
                        <TextInput
                          style={[styles.gearEditInput, { color: colors.text, borderColor: colors.border }]}
                          value={editGearVal}
                          onChangeText={setEditGearVal}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={saveGearEdit}
                        />
                      ) : (
                        <Text style={[styles.gearName, { color: colors.text }]}>{parts[1]}</Text>
                      )}
                    </View>
                    {isEditing ? (
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <Pressable onPress={saveGearEdit} hitSlop={10}>
                          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>Save</Text>
                        </Pressable>
                        <Pressable onPress={() => setEditGearIdx(null)} hitSlop={10}>
                          <Text style={{ color: colors.textSecondary, fontSize: 20 }}>×</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                        <Pressable onPress={() => { setEditGearIdx(i); setEditGearVal(parts[1]); }} hitSlop={10}>
                          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>✎</Text>
                        </Pressable>
                        <Pressable onPress={() => removeGear(item)} hitSlop={10}>
                          <Text style={{ color: colors.textSecondary, fontSize: 22 }}>×</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            {equipment.length > DEFAULT_EQUIPMENT_SHOW && (
              <Pressable
                style={[styles.expandBtn, { borderColor: colors.border }]}
                onPress={() => setEquipmentExpanded((v) => !v)}
              >
                <Text style={[styles.expandBtnText, { color: colors.textSecondary }]}>
                  {equipmentExpanded ? 'Show less ▲' : `View all ${equipment.length} items ▼`}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={[styles.emptyGear, { color: colors.textSecondary }]}>
            No gear added yet. Add your headphones, DAC, or amp above.
          </Text>
        )}

        {/* Achievements */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
        <Text style={[styles.achCount, { color: colors.textSecondary }]}>
          {unlockedSet.size} / {ACHIEVEMENTS.filter((a) => !a.hidden).length} unlocked
        </Text>

        {/* Near-miss */}
        {nearMiss.length > 0 && (
          <View style={styles.nearMissSection}>
            <Text style={[styles.nearMissLabel, { color: colors.textSecondary }]}>ALMOST THERE</Text>
            {nearMiss.map(({ achievement, progress }) => (
              <View key={achievement.id} style={[styles.nearMissRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.nearMissMeta}>
                  <Text style={styles.nearMissIcon}>{achievement.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nearMissTitle, { color: colors.text }]}>{achievement.title}</Text>
                    <Text style={[styles.nearMissDesc, { color: colors.textSecondary }]}>{achievement.description}</Text>
                  </View>
                  <Text style={[styles.nearMissPct, { color: colors.accent }]}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={[styles.nearMissTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.nearMissFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.achGrid}>
          {/* Weekly badge — full width at top */}
          {weeklyBadgeId && (() => {
            const { badge, daysLeft } = getCurrentWeekBadge();
            const earned = unlockedSet.has(weeklyBadgeId);
            return (
              <Pressable
                style={[styles.achTileWide, {
                  backgroundColor: earned ? colors.card : colors.background,
                  borderColor: colors.accent,
                }]}
                onPress={() => Alert.alert(
                  badge.title,
                  `${badge.description}\n\n+${badge.xpReward} XP · ${earned ? 'Earned this week!' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}`,
                  [{ text: 'OK' }]
                )}
              >
                <View style={styles.weekBadgeRow}>
                  <Text style={styles.achIcon}>{badge.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.weekBadgeTag, { color: colors.accent }]}>THIS WEEK ONLY</Text>
                    <Text style={[styles.nearMissTitle, { color: colors.text }]}>{badge.title}</Text>
                  </View>
                  {earned
                    ? <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 14 }}>✓</Text>
                    : <Text style={[styles.daysLeft, { color: colors.textSecondary }]}>{daysLeft}d</Text>
                  }
                </View>
              </Pressable>
            );
          })()}

          {visibleAch.map((ach) => {
            const unlocked = unlockedSet.has(ach.id);
            const showHidden = ach.hidden && !unlocked;
            return (
              <Pressable
                key={ach.id}
                style={[styles.achTile, {
                  backgroundColor: unlocked ? colors.card : colors.background,
                  borderColor: unlocked ? colors.accent : colors.border,
                  opacity: unlocked ? 1 : 0.45,
                }]}
                onPress={() => {
                  if (showHidden) return;
                  Alert.alert(ach.title, `${ach.description}\n\n+${ach.xpReward} XP`, [{ text: 'OK' }]);
                }}
              >
                <Text style={[styles.achIcon, { opacity: showHidden ? 0.3 : 1 }]}>
                  {showHidden ? '?' : ach.icon}
                </Text>
                <Text
                  style={[styles.achTitle, { color: unlocked ? colors.text : colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {showHidden ? '???' : ach.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {ACHIEVEMENTS.length > DEFAULT_SHOW && (
          <Pressable
            style={[styles.expandBtn, { borderColor: colors.border }]}
            onPress={() => setAchExpanded((v) => !v)}
          >
            <Text style={[styles.expandBtnText, { color: colors.textSecondary }]}>
              {achExpanded ? 'Show less ▲' : `View all ${ACHIEVEMENTS.length} achievements ▼`}
            </Text>
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Settings modal */}
      <Modal visible={settingsVisible} animationType="slide" transparent onRequestClose={() => setSettingsVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSettingsVisible(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Settings</Text>

          {!isPremiumUser && (
            <Pressable
              style={[styles.upgradeRow, { backgroundColor: colors.accent + '18', borderColor: colors.accent }]}
              onPress={() => { setSettingsVisible(false); router.push('/paywall'); }}
            >
              <Text style={[styles.upgradeRowText, { color: colors.accent }]}>✦ Upgrade to Listen Pro — $7.99</Text>
              <Text style={[styles.upgradeRowArrow, { color: colors.accent }]}>→</Text>
            </Pressable>
          )}

          <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>DISPLAY NAME</Text>
          <View style={styles.nameRow}>
            <TextInput
              style={[styles.nameInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
            />
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={saveName}>
              <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>Save</Text>
            </Pressable>
          </View>

          <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>APPEARANCE</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.themeBtn, {
                  borderColor: pref === opt.value ? colors.accent : colors.border,
                  backgroundColor: pref === opt.value ? colors.accent : colors.background,
                }]}
                onPress={() => setPref(opt.value)}
              >
                <Text style={{ color: pref === opt.value ? '#FFF' : colors.text, fontWeight: '500', fontSize: 14 }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>DEFAULT SESSION LENGTH</Text>
          <View style={styles.stepperRow}>
            <Pressable
              style={[styles.stepperBtn, { borderColor: colors.border }]}
              onPress={() => {
                const v = Math.max(5, defaultMins - 5);
                setDefaultMins(v);
                updateProfile({ defaultSessionMinutes: v });
              }}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>−</Text>
            </Pressable>
            <Text style={[styles.stepperVal, { color: colors.text }]}>{defaultMins} min</Text>
            <Pressable
              style={[styles.stepperBtn, { borderColor: colors.border }]}
              onPress={() => {
                const v = Math.min(120, defaultMins + 5);
                setDefaultMins(v);
                updateProfile({ defaultSessionMinutes: v });
              }}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>+</Text>
            </Pressable>
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Haptic feedback</Text>
            <Switch
              value={hapticsOn}
              onValueChange={(v) => {
                setHapticsOn(v);
                setHapticsEnabled(v);
                updateProfile({ hapticsEnabled: v });
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Notifications</Text>
            <Switch
              value={notifEnabled}
              onValueChange={async (v) => {
                setNotifEnabled(v);
                await updateProfile({ notificationsEnabled: v });
                if (v) {
                  await scheduleDailyReminder(notifHour);
                  await scheduleWeeklyRecap();
                } else {
                  await cancelAllListenNotifications();
                }
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFF"
            />
          </View>

          <Text style={[styles.settingLabel, { color: colors.textSecondary, marginTop: 4 }]}>WEEK STARTS ON</Text>
          <View style={styles.weekRow}>
            {(['monday', 'sunday'] as const).map((d) => (
              <Pressable
                key={d}
                style={[styles.weekBtn, {
                  borderColor: weekStart === d ? colors.accent : colors.border,
                  backgroundColor: weekStart === d ? colors.accent : colors.background,
                }]}
                onPress={() => { setWeekStart(d); updateProfile({ weekStartsOn: d }); }}
              >
                <Text style={{ color: weekStart === d ? '#FFF' : colors.text, fontWeight: '500', fontSize: 14, textTransform: 'capitalize' }}>
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>

          {notifEnabled && (
            <>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>
                {isPremiumUser ? 'DAILY REMINDER TIME' : 'DAILY REMINDER TIME 🔒 PRO'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }} contentContainerStyle={{ gap: 8 }}>
                {[7, 8, 12, 17, 18, 20, 21, 22].map((h) => {
                  const label = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
                  const active = notifHour === h;
                  return (
                    <Pressable
                      key={h}
                      style={[styles.themeBtn, {
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? colors.accent : colors.background,
                        paddingHorizontal: 14,
                      }]}
                      onPress={async () => {
                        if (!isPremiumUser) { router.push('/paywall'); return; }
                        setNotifHour(h);
                        await updateProfile({ notificationHour: h });
                        await scheduleDailyReminder(h);
                      }}
                    >
                      <Text style={{ color: active ? '#FFF' : colors.text, fontWeight: '500', fontSize: 14 }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={[styles.toggleRow, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Auto-complete on timer end</Text>
              <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Finish session automatically when the timer reaches zero</Text>
            </View>
            <Switch
              value={autoCompleteOn}
              onValueChange={(v) => {
                setAutoCompleteOn(v);
                updateProfile({ autoComplete: v });
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFF"
            />
          </View>

          <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>DANGER ZONE</Text>
          <Pressable style={[styles.dangerBtn, { borderColor: '#C0392B' }]} onPress={resetProgress}>
            <Text style={{ color: '#C0392B', fontWeight: '600', fontSize: 15 }}>Reset Progress</Text>
          </Pressable>

          <Text style={[styles.versionText, { color: colors.textSecondary }]}>Listen · v1.0.0</Text>

          <Pressable style={styles.aboutHeader} onPress={() => setAboutExpanded((v) => !v)}>
            <Text style={[styles.aboutHeaderText, { color: colors.text }]}>About</Text>
            <Text style={[styles.aboutChevron, { color: colors.textSecondary }]}>{aboutExpanded ? '▲' : '▼'}</Text>
          </Pressable>
          {aboutExpanded && (
            <View style={[styles.aboutBody, { borderColor: colors.border }]}>
              <Text style={[styles.aboutStory, { color: colors.textSecondary }]}>
                {"Created by Syreese Delos Santos — fed up with doom scrolling, wanted to actually enjoy his audio gear and listen to full albums without distractions. Listen is the app he wished existed."}
              </Text>
              <Text style={[styles.changelogTitle, { color: colors.text }]}>Changelog</Text>
              <Text style={[styles.changelogEntry, { color: colors.textSecondary }]}>
                {"v1.0  —  Session timer, XP & leveling, gear tracking, achievements, streaks, history, stats"}
              </Text>
              <Text style={[styles.changelogEntry, { color: colors.textSecondary }]}>
                {"Recent  —  History search, monthly & all-time stats, push notifications, weekly recap, streak shields, session sharing, custom notification time, auto-complete toggle, expandable About"}
              </Text>
            </View>
          )}

          <Pressable onPress={() => setSettingsVisible(false)} style={[styles.closeBtn, { backgroundColor: colors.border }]}>
            <Text style={[{ fontSize: 15, fontWeight: '600' }, { color: colors.text }]}>Close</Text>
          </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <XpToast
        visible={toastVisible}
        xp={toastXp}
        label="Gear added"
        onDone={() => setToastVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: height * 0.09, paddingBottom: 48 },
  // Level card
  levelCard: { borderWidth: 1.5, borderRadius: 20, padding: 22, marginBottom: 32 },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  levelLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  levelTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  profileName: { fontSize: 14, marginTop: 4 },
  levelRight: { alignItems: 'center', gap: 10 },
  levelBadge: { fontSize: 28, fontWeight: '700', borderWidth: 2, borderRadius: 16, width: 52, height: 52, textAlign: 'center', lineHeight: 48 },
  settingsIcon: { fontSize: 18 },
  xpBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  xpBarFill: { height: 8, borderRadius: 4 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpText: { fontSize: 12, fontWeight: '500' },
  sunkCost: { fontSize: 11, marginTop: 8 },
  // Gear
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  catRow: { marginBottom: 12 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  addBtn: { borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  addBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  gearList: { gap: 10, marginBottom: 32 },
  gearRow: { borderWidth: 1.5, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gearCat: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  gearName: { fontSize: 15, fontWeight: '500' },
  gearEditInput: { fontSize: 15, borderBottomWidth: 1, paddingBottom: 3, marginTop: 2 },
  emptyGear: { fontSize: 14, marginBottom: 32, lineHeight: 20 },
  // Achievements
  achCount: { fontSize: 13, marginBottom: 16, marginTop: -4 },
  nearMissSection: { marginBottom: 20, gap: 8 },
  nearMissLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  nearMissRow: { borderWidth: 1.5, borderRadius: 14, padding: 14 },
  nearMissMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  nearMissIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  nearMissTitle: { fontSize: 13, fontWeight: '600' },
  nearMissDesc: { fontSize: 11, marginTop: 1 },
  nearMissPct: { fontSize: 13, fontWeight: '700', minWidth: 34, textAlign: 'right' },
  nearMissTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  nearMissFill: { height: 4, borderRadius: 2 },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  achTile: {
    width: TILE, height: TILE + 22,
    borderWidth: 1.5, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', padding: 8, gap: 5,
  },
  achTileWide: { width: '100%', borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 0 },
  weekBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekBadgeTag: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  daysLeft: { fontSize: 12, fontWeight: '600' },
  achIcon: { fontSize: 22 },
  achTitle: { fontSize: 10, fontWeight: '500', textAlign: 'center', lineHeight: 13 },
  expandBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 24 },
  expandBtnText: { fontSize: 13, fontWeight: '500' },
  // Settings modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  settingLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  nameRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  nameInput: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  themeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  themeBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  dangerBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 24 },
  versionText: { fontSize: 12, textAlign: 'center', marginBottom: 16 },
  closeBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  stepperBtn: { borderWidth: 1.5, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: 22, fontWeight: '300', lineHeight: 26 },
  stepperVal: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  toggleSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  weekRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  weekBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  upgradeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
  upgradeRowText: { fontSize: 14, fontWeight: '600' },
  upgradeRowArrow: { fontSize: 16, fontWeight: '700' },
  aboutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, marginBottom: 4 },
  aboutHeaderText: { fontSize: 15, fontWeight: '500' },
  aboutChevron: { fontSize: 12 },
  aboutBody: { borderTopWidth: 1, paddingTop: 14, marginBottom: 24, gap: 12 },
  aboutStory: { fontSize: 13, lineHeight: 20 },
  changelogTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  changelogEntry: { fontSize: 12, lineHeight: 18 },
});
