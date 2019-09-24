"use strict";

/**
 * Utility functions used across the UI
 */

/**
 * Sets up listeners to detect browser capabilities
 */
export function detectCapabilities() {
  // Detect if the user is interacting with the screen via touching
  window.addEventListener(
    "touchstart",
    function onFirstTouch() {
      window.CAPABILITY_TOUCH = true;

      // Only need to detect human touch one time
      window.removeEventListener("touchstart", onFirstTouch, false);
    },
    false
  );
}

/**
 * If the user has interacted with the screen via touch
 * @returns {Bool} True if user has interacted via touch, false otherwise
 */
export function isTouching() {
  return true == window.CAPABILITY_TOUCH;
}
