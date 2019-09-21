"use strict";
/**
 * Testing for utils
 */

const utils = require("../../../../src/quagen/ui/utils.js");

test('isTouching not detected', () => {
  expect(utils.isTouching()).toBeFalsy();
});

test('isTouching detects touch', () => {
  global.CAPABILITY_TOUCH = true;
  expect(utils.isTouching()).toBeTruthy();
});