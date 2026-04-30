import { PlayScene } from "@/scenes/playScene";
import { $scene, getLevelScene } from "@/scenes/state";
import { serializeLevel, deserializeLevel } from "@/game/levelConfig";
import { EditScene } from "@/scenes/editScene";
import { Icon } from "@iconify/react";

export function LevelControls() {
  const handlePlay = () => {
    const levelScene = getLevelScene();
    if (!levelScene) return;
    $scene.set(new PlayScene(levelScene.level));
  };

  const handleSave = () => {
    const levelScene = getLevelScene();
    if (!levelScene) return;
    const serialized = serializeLevel(levelScene.level);
    localStorage.setItem("savedLevel", JSON.stringify(serialized));
    alert("Level saved!");
  };

  const handleLoad = () => {
    const saved = localStorage.getItem("savedLevel");
    if (!saved) {
      alert("No saved level found");
      return;
    }

    try {
      const serialized = JSON.parse(saved);
      const level = deserializeLevel(serialized);
      $scene.set(new EditScene(level));
      alert("Level loaded!");
    } catch (e) {
      console.error("Failed to load level", e);
      alert("Failed to load level");
    }
  };

  return (
    <div className="flex gap-2 p-2">
      <button
        title="Play Level"
        className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700"
        onClick={handlePlay}
      >
        <Icon icon="mdi:play" width={20} height={20} />
      </button>
      <button
        title="Save Level"
        className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700"
        onClick={handleSave}
      >
        <Icon icon="mdi:content-save" width={20} height={20} />
      </button>
      <button
        title="Load Level"
        className="px-4 py-2 bg-purple-600 text-white rounded cursor-pointer hover:bg-purple-700"
        onClick={handleLoad}
      >
        <Icon icon="mdi:folder-open" width={20} height={20} />
      </button>
    </div>
  );
}
