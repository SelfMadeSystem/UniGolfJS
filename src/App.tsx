import { AnimatePresence } from "motion/react";
import "./index.css";
import { useStore } from "@nanostores/react";
import { $scene } from "./scenes/state";
import { CanvasComponent } from "./render/canvasComponent";
import { FpsChart } from "./ui/FpsChart";

export function App() {
  const scene = useStore($scene);
  return (
    <>
      <CanvasComponent />
      <FpsChart className="pointer-events-none absolute top-14 left-4" />
      <AnimatePresence>
        <scene.ui key={scene.key} />
      </AnimatePresence>
    </>
  );
}

export default App;
