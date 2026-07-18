export type EventIconType = 'meteor' | 'launch' | 'moon' | 'iss' | 'other';

const ICON_MAP: Record<EventIconType, string> = {
  meteor: '☄️',
  launch: '🚀',
  moon: '🌕',
  iss: '🛰️',
  other: '✕',
};

export function getEventIconByType(type?: string): string {
  const key = (type ?? 'other') as EventIconType;
  return ICON_MAP[key] ?? ICON_MAP.other;
}
