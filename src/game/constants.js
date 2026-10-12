export const VIEW = Object.freeze({ width: 480, height: 340 });
export const STEP_MS = 10;
export const BODY_HZ = 60;
export const PHYSICS = Object.freeze({
  speed: 150,
  acceleration: 20,
  jump: 380,
  bounce: 400,
  reverseGravityImpulse: 10,
  coyoteFrames: 8,
  jumpBufferFrames: 10,
});
export const CLONE_TYPES = new Set([3, 17, 19, 25, 35]);
export const HAZARD_TYPES = new Set([9, 11, 13]);
export const EXIT_TYPES = new Set([5, 15]);
