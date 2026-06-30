import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { updateProfile } from '../../utils/storage';

const { height } = Dimensions.get('window');

const CATEGORIES = ['Headphones', 'IEMs', 'DAC', 'Amp', 'Speaker', 'Other'];

export default function EquipmentScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<{ category: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState('Headphones');
  const [inputValue, setInputValue] = useState('');

  function addItem() {
    if (!inputValue.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((prev) => [...prev, { category: activeCategory, name: inputValue.trim() }]);
    setInputValue('');
  }

  function removeItem(i: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function finish() {
    if (items.length > 0) {
      await updateProfile({ equipment: items.map((i) => `${i.category}: ${i.name}`) });
    }
    await updateProfile({ onboardingDone: true });
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.container]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.step, { color: colors.textSecondary }]}>3 of 4</Text>
        <Text style={[styles.title, { color: colors.text }]}>Your gear</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Add the equipment you listen with. Skip if you're not sure — you can add it later.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.catChip,
                {
                  backgroundColor: activeCategory === cat ? colors.accent : colors.card,
                  borderColor: activeCategory === cat ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={{ color: activeCategory === cat ? '#FFF' : colors.text, fontWeight: '500', fontSize: 14 }}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            placeholder={`e.g. Sony WH-1000XM5`}
            placeholderTextColor={colors.textSecondary}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <Pressable style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={addItem}>
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {items.length > 0 && (
          <View style={styles.itemList}>
            {items.map((item, i) => (
              <View key={i} style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.itemCategory, { color: colors.accent }]}>{item.category}</Text>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                </View>
                <Pressable onPress={() => removeItem(i)}>
                  <Text style={{ color: colors.textSecondary, fontSize: 20 }}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />

        <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={finish}>
          <Text style={styles.buttonText}>{items.length > 0 ? "Let's go" : 'Skip'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingTop: height * 0.1,
    paddingBottom: 48,
  },
  step: { fontSize: 13, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '600', letterSpacing: -0.5, marginTop: 8, marginBottom: 8 },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 28 },
  catRow: { marginBottom: 16 },
  catChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  addBtn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  itemList: { gap: 10 },
  itemRow: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCategory: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  itemName: { fontSize: 16, fontWeight: '500' },
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});
