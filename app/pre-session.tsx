import {
  View, Text, StyleSheet, Pressable, Switch, ScrollView, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { getProfile } from '../utils/storage';

const { height } = Dimensions.get('window');

const TIPS = [
  { id: 'dnd', label: 'Do Not Disturb', sub: 'Block calls and notifications' },
  { id: 'airplane', label: 'Airplane Mode', sub: 'Full offline disconnection' },
  { id: 'quiet', label: 'Find a quiet spot', sub: 'Minimize distractions around you' },
  { id: 'gear', label: 'Put on your best gear', sub: 'Good equipment deserves a real session' },
];

export default function PreSession() {
  const { colors } = useTheme();
  const router = useRouter();
  const { minutes } = useLocalSearchParams<{ minutes: string }>();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [equipment, setEquipment] = useState<string[]>([]);
  const [selectedGear, setSelectedGear] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getProfile().then((p) => setEquipment(p?.equipment ?? []));
  }, []);

  function toggle(id: string) {
    Haptics.selectionAsync();
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleGear(item: string) {
    Haptics.selectionAsync();
    setSelectedGear((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  function begin() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const chosen = equipment.filter((g) => selectedGear[g]);
    router.replace({
      pathname: '/session',
      params: { minutes, equipment: JSON.stringify(chosen) },
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Set the scene</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Take a moment to disconnect. Check off what applies to you.
      </Text>

      <View style={styles.tips}>
        {TIPS.map((tip) => (
          <Pressable
            key={tip.id}
            style={[styles.tipRow, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => toggle(tip.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipLabel, { color: colors.text }]}>{tip.label}</Text>
              <Text style={[styles.tipSub, { color: colors.textSecondary }]}>{tip.sub}</Text>
            </View>
            <Switch
              value={!!checked[tip.id]}
              onValueChange={() => toggle(tip.id)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </Pressable>
        ))}
      </View>

      {equipment.length > 0 && (
        <View style={styles.gearSection}>
          <Text style={[styles.gearLabel, { color: colors.textSecondary }]}>LISTENING WITH</Text>
          <View style={styles.gearChips}>
            {equipment.map((item) => {
              const selected = !!selectedGear[item];
              const name = item.includes(': ') ? item.split(': ')[1] : item;
              return (
                <Pressable
                  key={item}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.accent : colors.card,
                    },
                  ]}
                  onPress={() => toggleGear(item)}
                >
                  <Text style={[styles.chipText, { color: selected ? '#FFF' : colors.text }]}>
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={begin}>
        <Text style={styles.buttonText}>I'm ready</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 32, paddingTop: height * 0.12, paddingBottom: 48 },
  title: { fontSize: 32, fontWeight: '600', letterSpacing: -0.5, marginBottom: 10 },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 32 },
  tips: { gap: 12, marginBottom: 32 },
  tipRow: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipLabel: { fontSize: 16, fontWeight: '500' },
  tipSub: { fontSize: 13, marginTop: 2 },
  gearSection: { marginBottom: 32, gap: 12 },
  gearLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  gearChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: '500' },
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});
