import * as Expo from 'expo-haptics';

let _enabled = true;

export function setHapticsEnabled(v: boolean) {
  _enabled = v;
}

export function impact(style = Expo.ImpactFeedbackStyle.Light) {
  if (_enabled) Expo.impactAsync(style);
}

export function selection() {
  if (_enabled) Expo.selectionAsync();
}

export function notification(type = Expo.NotificationFeedbackType.Success) {
  if (_enabled) Expo.notificationAsync(type);
}

export function heavy() {
  if (_enabled) Expo.impactAsync(Expo.ImpactFeedbackStyle.Heavy);
}
