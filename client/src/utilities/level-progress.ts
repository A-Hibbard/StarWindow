import type { AuthUser, UserLevelSummary } from './users-service';

export function getLevelProgressPercent(level?: UserLevelSummary | null) {
  if (!level || level.next_level_points == null) return 100;
  const span = level.next_level_points - level.current_level_points;
  if (span <= 0) return 100;
  return Math.max(0, Math.min(100, (level.points_into_level / span) * 100));
}

export function getLevelProgressLabel(level?: UserLevelSummary | null) {
  if (!level) return null;
  if (level.next_level_points == null) return `${level.total_points} pts`;
  return `${level.total_points} pts - ${level.points_to_next_level} to next level`;
}

export function getUserLevelProgressPercent(user: AuthUser | null) {
  return getLevelProgressPercent(user?.level);
}

export function getUserLevelProgressLabel(user: AuthUser | null) {
  return getLevelProgressLabel(user?.level);
}
