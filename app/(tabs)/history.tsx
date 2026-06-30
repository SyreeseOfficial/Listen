import { View, Text, StyleSheet, FlatList, Pressable, Dimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { getSessions, type Session } from '../../utils/storage';
import { formatDuration } from '../../utils/stats';

const { height } = Dimensions.get('window');
const STARS = [1, 2, 3, 4, 5];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function hasDetails(s: Session): boolean {
  return !!(s.equipmentUsed?.length || s.rating || s.album || s.notes);
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      getSessions().then(setSessions);
    }, [])
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (sessions.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyIcon, { color: colors.border }]}>◎</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions yet</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
          Start your first listening session to see your history here.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.pageTitle, { color: colors.text }]}>History</Text>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const isExpanded = expanded.has(item.id);
          const expandable = hasDetails(item);
          return (
            <Pressable
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => expandable && toggleExpand(item.id)}
            >
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardDate, { color: colors.text }]}>{formatDate(item.completedAt)}</Text>
                  <Text style={[styles.cardTime, { color: colors.textSecondary }]}>{formatTime(item.completedAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.cardDuration, { color: colors.accent }]}>{formatDuration(item.duration)}</Text>
                  {!item.completed && (
                    <Text style={[styles.cardIncomplete, { color: colors.textSecondary }]}>incomplete</Text>
                  )}
                  {expandable && (
                    <Text style={[styles.chevron, { color: colors.textSecondary }]}>{isExpanded ? '▲' : '▼'}</Text>
                  )}
                </View>
              </View>

              {/* Expanded details */}
              {isExpanded && (
                <View style={[styles.details, { borderTopColor: colors.border }]}>
                  {item.rating != null && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Rating</Text>
                      <Text style={styles.detailStars}>
                        {STARS.map((s) => (
                          <Text key={s} style={{ color: s <= item.rating! ? colors.accent : colors.border }}>★</Text>
                        ))}
                      </Text>
                    </View>
                  )}
                  {item.album && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Listened to</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{item.album}</Text>
                    </View>
                  )}
                  {item.equipmentUsed && item.equipmentUsed.length > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gear</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {item.equipmentUsed.map((g) => g.includes(': ') ? g.split(': ')[1] : g).join(', ')}
                      </Text>
                    </View>
                  )}
                  {item.notes && (
                    <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes</Text>
                      <Text style={[styles.detailValue, { color: colors.text, flex: 1 }]}>{item.notes}</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: height * 0.09 },
  pageTitle: { fontSize: 32, fontWeight: '600', marginBottom: 24 },
  card: { borderWidth: 1.5, borderRadius: 14, overflow: 'hidden' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  cardDate: { fontSize: 16, fontWeight: '500' },
  cardTime: { fontSize: 13, marginTop: 2 },
  cardDuration: { fontSize: 20, fontWeight: '600' },
  cardIncomplete: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 10, marginTop: 6 },
  details: { borderTopWidth: 1, paddingHorizontal: 18, paddingVertical: 14, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  detailLabel: { fontSize: 12, fontWeight: '500', minWidth: 80 },
  detailValue: { fontSize: 14, textAlign: 'right', flexShrink: 1 },
  detailStars: { fontSize: 16, letterSpacing: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 22, fontWeight: '600' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
