export type CalendarEvent = {
  id: string;
  date: number;
  title: string;
  time: string;
  detail: string;
  icon?: string;
};

// Shared placeholder events until the calendar is backed by API data.
export const CalendarEvents: CalendarEvent[] = [
  {
    id: '1',
    date: 12,
    title: 'Perseid Meteor Shower Peak',
    time: '02:00 AM - 05:00 AM Local',
    detail:
      'Expected ZHR (Zenith Hourly Rate) of up to 100 meteors per hour. Best viewing conditions far from city lights.',
    icon: '*',
  },
  {
    id: '2',
    date: 12,
    title: 'Falcon 9 - Starlink Group 8-2',
    time: '21:45 PM Local',
    detail: 'Launch visible from Eastern seaboard. Trajectory indicates clear visibility post-stage separation.',
    icon: '*',
  },
  {
    id: '3',
    date: 12,
    title: 'Sturgeon Supermoon',
    time: 'All Night',
    detail: 'The Moon will be near its closest approach to the Earth and may look slightly larger than usual.',
    icon: '*',
  },
  {
    id: '4',
    date: 8,
    title: 'ISS Fly Over',
    time: '19:30 PM Local',
    detail: 'International Space Station visible overhead.',
    icon: '*',
  },
];
