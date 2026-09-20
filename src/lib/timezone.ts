// Vietnam has a fixed UTC+7 offset with no DST, so a plain millisecond shift
// is enough — no timezone database / library is needed.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const REDBUBBLE_RESET_HOUR = 14;

function toVNShifted(date: Date): Date {
  return new Date(date.getTime() + VN_OFFSET_MS);
}

function fromVNShifted(date: Date): Date {
  return new Date(date.getTime() - VN_OFFSET_MS);
}

/**
 * The most recent Redbubble reset boundary (14:00 Vietnam time) at or before `now`,
 * returned as a real UTC Date usable directly in Prisma queries.
 */
export function getRedbubbleResetBoundary(now: Date = new Date()): Date {
  const vnNow = toVNShifted(now);
  const boundaryVN = new Date(
    Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate(), REDBUBBLE_RESET_HOUR, 0, 0, 0)
  );
  if (vnNow.getTime() < boundaryVN.getTime()) {
    boundaryVN.setUTCDate(boundaryVN.getUTCDate() - 1);
  }
  return fromVNShifted(boundaryVN);
}

/** The next upcoming Redbubble reset moment (real UTC Date), strictly after `now`. */
export function getNextRedbubbleReset(now: Date = new Date()): Date {
  return new Date(getRedbubbleResetBoundary(now).getTime() + DAY_MS);
}

/** Start of the rolling 24h TeePublic window. */
export function getTeepublicWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - DAY_MS);
}
