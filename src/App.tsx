import { AnimatePresence } from "motion/react";
import "./index.css";
import { useStore } from "@nanostores/react";
import { $scene } from "./scenes/state";
import { CanvasComponent } from "./render/canvasComponent";

export function App() {
  const scene = useStore($scene);
  return (
    <>
      <CanvasComponent />
      <AnimatePresence>
        <scene.ui key={scene.key} />
      </AnimatePresence>
    </>
  );
}

export default App;
