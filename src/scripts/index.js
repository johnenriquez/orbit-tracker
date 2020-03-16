// TODO:
// refactor
// clean up code; make modular for repeatable sat renders
// build UI
// add observation location

import OrbitTracker from "./OrbitTracker";

// set up canvas
const canvas = document.querySelector("#c");

// figure out which satellite
const urlParams = new URLSearchParams(window.location.search);
const satId = urlParams.get("satId");

// run it
const ot = new OrbitTracker({ canvas, satId });
ot.start();