import {
  View, Text, StyleSheet, FlatList, Pressable, Dimensions, ScrollView, TextInput, Modal,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../context/ThemeContext';
import { getSessions, updateSession, deleteSession, type Session } from '../../utils/storage';
import { formatDuration } from '../../utils/stats';
import SessionShareCard from '../../components/SessionShareCard';

const { height } = Dimensions.get('window');
const STARS = [1, 2, 3, 4, 5];

type FilterKey = 'all' | 'completed' | 'incomplete' | 'rated' | 'long';
type SortKey = 'newest' | 'oldest' | 'longest' | 'top';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'incomplete', label: 'Incomplete' },
  { key: 'rated', label: 'Rated' },
  { key: 'long', label: '30m+' },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'longest', label: 'Longest' },
  { key: 'top', label: 'Top Rated' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function applyFilter(list: Session[], f: FilterKey): Session[] {
  switch (f) {
    case 'completed': return list.filter((s) => s.completed);
    case 'incomplete': return list.filter((s) => !s.completed);
    case 'rated': return list.filter((s) => s.rating != null);
    case 'long': return list.filter((s) => s.duration >= 1800);
    default: return list;
  }
}

function applySort(list: Session[], s: SortKey): Session[] {
  const copy = [...list];
  switch (s) {
    case 'newest': return copy.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    case 'oldest': return copy.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
    case 'longest': return copy.sort((a, b) => b.duration - a.duration);
    case 'top': return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortIdx, setSortIdx] = useState(0);
  const [search, setSearch] = useState('');

  // Edit state — one session at a time
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editAlbum, setEditAlbum] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [shareSession, setShareSession] = useState<Session | null>(null);
  const shareCardRef = useRef<View>(null);

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

  function startEdit(item: Session) {
    setEditingId(item.id);
    setEditRating(item.rating ?? 0);
    setEditAlbum(item.album ?? '');
    setEditNotes(item.notes ?? '');
    // ensure expanded
    setExpanded((prev) => {
      if (prev.has(item.id)) return prev;
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleShare() {
    if (!shareCardRef.current) return;
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (_) {}
    setShareSession(null);
  }

  async function saveEdit(id: string) {
    const patch: Partial<Session> = {
      rating: editRating || undefined,
      album: editAlbum.trim() || undefined,
      notes: editNotes.trim() || undefined,
    };
    await updateSession(id, patch);
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
    setEditingId(null);
  }

  const currentSort = SORTS[sortIdx];
  const q = search.trim().toLowerCase();
  const displaySessions = applySort(applyFilter(sessions, filter), currentSort.key)
    .filter((s) => !q || (s.album ?? '').toLowerCase().includes(q) || (s.notes ?? '').toLowerCase().includes(q));

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
      {/* Title + sort pill */}
      <View style={styles.titleRow}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>History</Text>
        <Pressable
          style={[styles.sortPill, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setSortIdx((i) => (i + 1) % SORTS.length)}
        >
          <Text style={[styles.sortPillText, { color: colors.textSecondary }]}>{currentSort.label}</Text>
          <Text style={[styles.sortPillArrow, { color: colors.accent }]}>↕</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>⌕</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search albums, notes…"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterChip, {
              backgroundColor: filter === f.key ? colors.accent : colors.card,
              borderColor: filter === f.key ? colors.accent : colors.border,
            }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, { color: filter === f.key ? '#FFF' : colors.text }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={displaySessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyFilter}>
            <Text style={[styles.emptyFilterText, { color: colors.textSecondary }]}>
              No sessions match this filter.
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isExpanded = expanded.has(item.id);
          const isEditing = editingId === item.id;

          return (
            <Swipeable
              renderRightActions={() => (
                <Pressable style={styles.deleteAction} onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              )}
              overshootRight={false}
            >
            <Pressable
              style={[styles.card, { backgroundColor: colors.card, borderColor: isEditing ? colors.accent : colors.border }]}
              onPress={() => toggleExpand(item.id)}
            >
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardDate, { color: colors.text }]}>{formatDate(item.completedAt)}</Text>
                  <Text style={[styles.cardTime, { color: colors.textSecondary }]}>{formatTime(item.completedAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.cardDuration, { color: colors.accent }]}>{formatDuration(item.duration)}</Text>
                  {!item.completed && (
                    <Text style={[styles.cardIncomplete, { color: colors.textSecondary }]}>incomplete</Text>
                  )}
                  <Text style={[styles.chevron, { color: colors.textSecondary }]}>
                    {isExpanded ? '▲' : '▼'}
                  </Text>
                </View>
              </View>

              {/* Expanded details */}
              {isExpanded && (
                <View style={[styles.details, { borderTopColor: colors.border }]}>
                  {!isEditing && (
                    <>
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
                      {/* Edit + Share triggers */}
                      <View style={styles.detailActions}>
                        <Pressable onPress={() => startEdit(item)}>
                          <Text style={[styles.editTrigger, { color: colors.textSecondary }]}>
                            {item.rating == null && !item.album && !item.notes ? 'Log this session →' : 'Edit →'}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => setShareSession(item)}>
                          <Text style={[styles.editTrigger, { color: colors.accent }]}>Share ↗</Text>
                        </Pressable>
                      </View>
                    </>
                  )}

                  {isEditing && (
                    <View style={styles.editForm}>
                      {/* Rating */}
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Rating</Text>
                      <View style={styles.starsRow}>
                        {STARS.map((s) => (
                          <Pressable key={s} onPress={() => setEditRating(editRating === s ? 0 : s)} hitSlop={6}>
                            <Text style={[styles.star, { color: s <= editRating ? colors.accent : colors.border }]}>★</Text>
                          </Pressable>
                        ))}
                      </View>

                      {/* Album */}
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Listened to</Text>
                      <TextInput
                        style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
                        value={editAlbum}
                        onChangeText={setEditAlbum}
                        placeholder="Album, artist, or playlist"
                        placeholderTextColor={colors.textSecondary}
                        returnKeyType="next"
                      />

                      {/* Notes */}
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Notes</Text>
                      <TextInput
                        style={[styles.editInput, styles.editInputMulti, { color: colors.text, borderColor: colors.border }]}
                        value={editNotes}
                        onChangeText={setEditNotes}
                        placeholder="Anything worth remembering"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        returnKeyType="done"
                      />

                      {/* Save / Cancel */}
                      <View style={styles.editActions}>
                        <Pressable
                          style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                          onPress={() => saveEdit(item.id)}
                        >
                          <Text style={styles.saveBtnText}>Save</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.cancelBtn, { borderColor: colors.border }]}
                          onPress={() => setEditingId(null)}
                        >
                          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
            </Swipeable>
          );
        }}
      />
      {/* Share modal */}
      <Modal visible={shareSession != null} transparent animationType="slide" onRequestClose={() => setShareSession(null)}>
        <Pressable style={styles.shareOverlay} onPress={() => setShareSession(null)} />
        <View style={[styles.shareSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.shareTitle, { color: colors.text }]}>Share session</Text>
          <View style={styles.shareCardWrap}>
            {shareSession && (
              <SessionShareCard
                ref={shareCardRef}
                duration={shareSession.duration}
                completedAt={shareSession.completedAt}
                album={shareSession.album}
                rating={shareSession.rating}
                accent={colors.accent}
              />
            )}
          </View>
          <Pressable style={[styles.shareBtn, { backgroundColor: colors.accent }]} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share →</Text>
          </Pressable>
          <Pressable onPress={() => setShareSession(null)}>
            <Text style={[styles.shareCancel, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: height * 0.09 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pageTitle: { fontSize: 32, fontWeight: '600' },
  sortPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  sortPillText: { fontSize: 13, fontWeight: '500' },
  sortPillArrow: { fontSize: 13, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { flexGrow: 0, marginHorizontal: -24, marginBottom: 16 },
  filterContent: { paddingHorizontal: 24, gap: 8 },
  filterChip: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  card: { borderWidth: 1.5, borderRadius: 14, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  cardDate: { fontSize: 16, fontWeight: '500' },
  cardTime: { fontSize: 13, marginTop: 2 },
  cardDuration: { fontSize: 20, fontWeight: '600' },
  cardIncomplete: { fontSize: 12 },
  chevron: { fontSize: 10 },
  details: { borderTopWidth: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  detailLabel: { fontSize: 12, fontWeight: '500', minWidth: 80 },
  detailValue: { fontSize: 14, textAlign: 'right', flexShrink: 1 },
  detailStars: { fontSize: 16, letterSpacing: 2 },
  editTrigger: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  // Edit form
  editForm: { gap: 10 },
  editLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: -2 },
  starsRow: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 28 },
  editInput: {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15,
  },
  editInputMulti: { minHeight: 72, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  cancelBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  cancelBtnText: { fontSize: 14, fontWeight: '500' },
  detailActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  deleteAction: {
    backgroundColor: '#C0392B', justifyContent: 'center', alignItems: 'center',
    width: 80, borderRadius: 14, marginLeft: 8,
  },
  deleteText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  // Share modal
  shareOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  shareSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  shareTitle: { fontSize: 20, fontWeight: '600' },
  shareCardWrap: { alignItems: 'center' },
  shareBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  shareBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  shareCancel: { textAlign: 'center', fontSize: 15, paddingVertical: 4 },
  // Empty states
  emptyFilter: { paddingTop: 48, alignItems: 'center' },
  emptyFilterText: { fontSize: 15 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 22, fontWeight: '600' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
