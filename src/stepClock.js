// Display-independent simulation stepping, shared by all three canvases.
//
// Simulations advance in fixed logical ticks of wall-clock time (TICK_HZ per second), not
// once per animation frame, so a 120 Hz display runs them at the same speed as a 60 Hz one.
// Each scenario keeps a fractional step accumulator: every frame adds
// stepsPerTick * elapsedTicks, runs the whole steps and keeps the remainder. At one step per
// tick, 0.25x runs a step every fourth tick and 4x runs four steps per tick.

export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;

// Longest gap credited to one frame. After a stall or a background tab the simulation picks up
// where it was instead of replaying the missed time in a single burst.
export const MAX_FRAME_MS = 100;

// Frame gaps this close to a whole number of ticks count as exactly that many. A 59.94 Hz or
// 60.05 Hz display (or a dropped frame on one) then steps evenly every frame instead of drifting
// against the logical clock and occasionally running zero or two steps in one frame at 1x.
export const SNAP_TICKS = 0.05;

// Starting phase for a fresh accumulator. Keeping it off the step boundary means small timing
// jitter on an unsnapped display rarely flips a frame between running and skipping a step.
export const ACC_START = 0.125;

/**
 * Logical ticks elapsed between two requestAnimationFrame timestamps. The first frame of a
 * loop (no previous timestamp) counts as one tick so stepping starts immediately.
 */
export function frameTicks(prevTs, ts) {
  if (prevTs == null) return 1;
  if (!(ts > prevTs)) return 0;
  const ticks = Math.min(ts - prevTs, MAX_FRAME_MS) / TICK_MS;
  const whole = Math.round(ticks);
  return whole > 0 && Math.abs(ticks - whole) <= SNAP_TICKS ? whole : ticks;
}

/**
 * Credits `ticks` logical ticks at `stepsPerTick` to the accumulator `acc`.
 * Returns the whole steps to run now and the remainder (always in [0, 1)) to keep.
 */
export function takeSteps(acc, stepsPerTick, ticks) {
  const total = acc + Math.max(0, stepsPerTick * ticks);
  const steps = Math.floor(total);
  return { steps, acc: total - steps };
}
