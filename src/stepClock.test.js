import { test } from "node:test";
import assert from "node:assert/strict";
import { ACC_START, MAX_FRAME_MS, TICK_MS, frameTicks, takeSteps } from "./stepClock.js";

// Runs `frames` frames of `ticksPerFrame` ticks and returns the steps taken in each frame.
function stepsPerFrame(stepsPerTick, ticksPerFrame, frames) {
  let acc = ACC_START;
  const out = [];
  for (let i = 0; i < frames; i++) {
    const r = takeSteps(acc, stepsPerTick, ticksPerFrame);
    assert.ok(r.acc >= 0 && r.acc < 1, `remainder ${r.acc} out of range`);
    acc = r.acc;
    out.push(r.steps);
  }
  return out;
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

test("each speed runs its share of steps at 60 Hz, one tick per frame", () => {
  assert.deepEqual(stepsPerFrame(0.25, 1, 8), [0, 0, 0, 1, 0, 0, 0, 1]);
  assert.deepEqual(stepsPerFrame(0.5, 1, 6), [0, 1, 0, 1, 0, 1]);
  assert.deepEqual(stepsPerFrame(1, 1, 4), [1, 1, 1, 1]);
  assert.deepEqual(stepsPerFrame(2, 1, 4), [2, 2, 2, 2]);
  assert.deepEqual(stepsPerFrame(4, 1, 4), [4, 4, 4, 4]);
});

test("one second of steps does not depend on the display refresh rate", () => {
  for (const speed of [0.25, 0.5, 1, 2, 4]) {
    for (const hz of [30, 60, 75, 120, 144, 240]) {
      const steps = sum(stepsPerFrame(speed, 60 / hz, hz));
      assert.ok(Math.abs(steps - 60 * speed) <= 1, `${speed}x at ${hz} Hz ran ${steps} steps`);
    }
  }
});

test("fractional step rates (wavefront 0.4 per tick) accumulate exactly", () => {
  assert.equal(sum(stepsPerFrame(0.4, 1, 600)), 240);
  assert.equal(sum(stepsPerFrame(0.4 * 0.25, 1, 600)), 60);
});

test("frameTicks converts frame gaps to logical ticks", () => {
  assert.equal(frameTicks(null, 1234), 1, "first frame of a loop counts as one tick");
  assert.equal(frameTicks(1000, 1000), 0);
  assert.equal(frameTicks(1000, 990), 0);
  assert.equal(frameTicks(0, TICK_MS), 1);
  assert.equal(frameTicks(0, TICK_MS / 2), 0.5);
  assert.ok(Math.abs(frameTicks(0, 1000 / 144) - 60 / 144) < 1e-12, "144 Hz is not snapped");
});

test("frameTicks snaps near-60 Hz gaps and dropped frames to whole ticks", () => {
  assert.equal(frameTicks(0, 1000 / 59.94), 1);
  assert.equal(frameTicks(0, 1000 / 60.05), 1);
  assert.equal(frameTicks(0, 16.0), 1);
  assert.equal(frameTicks(0, 2 * TICK_MS + 0.3), 2);
});

test("frameTicks caps long gaps instead of replaying them", () => {
  assert.equal(frameTicks(0, 5000), Math.round(MAX_FRAME_MS / TICK_MS));
});
