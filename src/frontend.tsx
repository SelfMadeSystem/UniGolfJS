/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import init from "ishape_wasm";
import ishapeWasm from "ishape_wasm/ishape_wasm_bg.wasm" with { type: "file" };
import { unionPolygons } from "./utils/shapeUtils";
import { Vector2 } from "./utils/vec";

await init({
  module_or_path: ishapeWasm,
}).then(() => {
  console.log("ishape_wasm initialized");
}).catch((err) => {
  console.error("Failed to initialize ishape_wasm", err);
});

console.log(unionPolygons([
  [
    new Vector2(0, 0),
    new Vector2(100, 0),
    new Vector2(100, 100),
    new Vector2(0, 100),
  ],
  [
    new Vector2(50, 50),
    new Vector2(150, 50),
    new Vector2(150, 150),
    new Vector2(50, 150),
  ],
]));


const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
(import.meta.hot.data.root ??= createRoot(elem)).render(app);
