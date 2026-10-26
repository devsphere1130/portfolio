// Time helpers for the hero's 3D animation.
//
// Don't animate from `state.clock.elapsedTime`: React Three Fiber resets that clock whenever the
// canvas pauses and resumes (tab hidden, scrolled away), and the jump made the sphere spin dozens of
// turns to catch up. Instead each animated part keeps its own time, advanced by the frame's delta.

// Longest step one frame may advance. After the tab was hidden or the device slept, the first
// delta can be seconds long; capping it makes the animation resume exactly where it stopped.
export const MAX_FRAME_DELTA = 0.05;

/** The frame's time step in seconds, capped. 0 when motion is reduced, which freezes the animation. */
export const frameDelta = (delta, reduced = false) => (reduced ? 0 : Math.min(Math.max(delta, 0), MAX_FRAME_DELTA));

/**
 * Frame-rate-independent version of `lerp(current, target, perFrame)`: `perFrame` is the fraction
 * to move per 60 Hz frame, so the feel is the same on 60, 120 or 144 Hz screens.
 */
export const smoothing = (perFrame, dt) => 1 - (1 - perFrame) ** (dt * 60);
