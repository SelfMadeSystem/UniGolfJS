import type { Placeable } from "@/game/editor/placeables";
import { $selectedPlaceable } from "@/game/editor/state";
import { Icon } from "@iconify/react";
import { useStore } from "@nanostores/react";

function PlaceableComponent({ placeable }: { placeable: Placeable }) {
  const selectedPlaceable = useStore($selectedPlaceable);
  const isSelected = selectedPlaceable === placeable;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
        isSelected ? "bg-blue-500 text-white" : "hover:bg-gray-700/50"
      }`}
      onClick={() => {
        $selectedPlaceable.set(isSelected ? null : placeable);
      }}
      title={placeable.name}
    >
      <Icon icon={placeable.icon} width={24} height={24} />
    </div>
  );
}

export function PlaceMenu({ placeables }: { placeables: Placeable[] }) {
  return (
    <div className="pointer-events-auto p-4 bg-black/50 w-sm rounded shadow">
      <h2 className="text-lg font-bold mb-2">Placeables</h2>
      <div className="flex flex-row flex-wrap gap-2">
        {placeables.map((placeable) => (
          <PlaceableComponent key={placeable.id} placeable={placeable} />
        ))}
      </div>
    </div>
  );
}
