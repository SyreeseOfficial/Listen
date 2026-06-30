import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getSessions } from './storage';

function esc(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function exportHistory(): Promise<void> {
  const sessions = await getSessions();

  const header = 'Date,Time,Duration (min),Completed,Rating,Listened To,Notes,Equipment\n';
  const rows = sessions.map((s) => {
    const d = new Date(s.completedAt);
    return [
      d.toLocaleDateString('en-US'),
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      Math.floor(s.duration / 60),
      s.completed ? 'Yes' : 'No',
      s.rating ?? '',
      esc(s.album ?? ''),
      esc(s.notes ?? ''),
      esc((s.equipmentUsed ?? []).map((g) => (g.includes(': ') ? g.split(': ')[1] : g)).join(', ')),
    ].join(',');
  });

  const csv = header + rows.join('\n');
  const path = `${FileSystem.cacheDirectory}listen-history.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export Listening History' });
}
