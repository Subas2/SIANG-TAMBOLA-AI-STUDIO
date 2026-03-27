/**
 * This global state is used to track the last number and winner announcement by the admin.
 * It's stored outside of any React component to persist across component
 * re-mounts, which can happen during navigation with keyed components.
 * This prevents the same announcements from being triggered repeatedly.
 */
export const announcementState: { 
    lastWinnerAnnouncementTimestamp: number;
} = {
  lastWinnerAnnouncementTimestamp: 0,
};