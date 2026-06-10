import './index.css';
import { CanvasComponent } from './render/canvasComponent';
import { $scene } from './scenes/state';
import { FpsChart } from './ui/FpsChart';
import { useStore } from '@nanostores/react';
import { AnimatePresence } from 'motion/react';

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
