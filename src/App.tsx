import './index.css';
import { CanvasComponent } from './render/canvasComponent';
import { $scene } from './scenes/state';
import { FpsChart } from './ui/FpsChart';
import { useStore } from '@nanostores/react';
import { AnimatePresence } from 'motion/react';
import { atom } from 'nanostores';
import { useRef } from 'react';

export function App() {
  const fpsDetailsRef = useRef<HTMLDetailsElement>(null);
  const scene = useStore($scene);
  return (
    <>
      <CanvasComponent />
      <details
        ref={fpsDetailsRef}
        className="group absolute top-14 left-4 select-none"
        onClick={e => {
          e.preventDefault();
          fpsDetailsRef.current!.open = !fpsDetailsRef.current!.open;
        }}
        open
      >
        <summary className="group-open:hidden">Show FPS</summary>
        <FpsChart />
      </details>
      <AnimatePresence>
        <scene.ui key={scene.key} />
      </AnimatePresence>
    </>
  );
}

export default App;
