"use strict";

/**
 * Exports our Svelte apps for use in the HTML templates.
 */

export { default as Game } from "./game/App.svelte";
export { default as Menu } from "./menu/App.svelte";
export { detectCapabilities } from "./utils.js";
