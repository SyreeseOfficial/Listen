import { View, Text, StyleSheet } from 'react-native';
import { forwardRef } from 'react';

const STARS = [1, 2, 3, 4, 5];

function formatDur(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type Props = {
  duration: number;
  completedAt: string;
  album?: string;
  rating?: number;
  accent: string;
};

const SessionShareCard = forwardRef<View, Props>(({ duration, completedAt, album, rating, accent }, ref) => (
  <View ref={ref} style={styles.card} collapsable={false}>
    <View style={styles.topRow}>
      <Text style={styles.logo}>◎ Listen</Text>
    </View>

    <Text style={[styles.duration, { color: accent }]}>{formatDur(duration)}</Text>

    {album ? <Text style={styles.album}>{album}</Text> : null}

    {rating != null && (
      <View style={styles.starsRow}>
        {STARS.map((s) => (
          <Text key={s} style={[styles.star, { color: s <= rating ? accent : '#444' }]}>★</Text>
        ))}
      </View>
    )}

    <View style={styles.footer}>
      <Text style={styles.date}>{formatDate(completedAt)}</Text>
      <Text style={[styles.tag, { color: accent }]}>intentional listening</Text>
    </View>
  </View>
));

SessionShareCard.displayName = 'SessionShareCard';
export default SessionShareCard;

const styles = StyleSheet.create({
  card: {
    width: 320,
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 28,
    gap: 10,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  logo: { color: '#888', fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  duration: { fontSize: 64, fontWeight: '200', letterSpacing: -2 },
  album: { color: '#FFF', fontSize: 18, fontWeight: '500', lineHeight: 24 },
  starsRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
  star: { fontSize: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  date: { color: '#666', fontSize: 13 },
  tag: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
});
