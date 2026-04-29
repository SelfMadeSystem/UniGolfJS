import type { Placeable } from "@/game/editor/placeables";
import { $selectedPlaceable, setSelectedPlaceable } from "@/game/editor/state";
import { Icon } from "@iconify/react";
import { useStore } from "@nanostores/react";

function PlaceableComponent({
  placeable,
  onSelect,
}: {
  placeable: Placeable;
  onSelect: () => void;
}) {
  const selectedPlaceable = useStore($selectedPlaceable);
  const isSelected = selectedPlaceable === placeable;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
        isSelected ? "bg-blue-500 text-white" : "hover:bg-gray-700/50"
      }`}
      onClick={() => {
        setSelectedPlaceable(placeable);
        onSelect();
      }}
      title={placeable.name}
    >
      <Icon icon={placeable.icon} width={24} height={24} />
    </div>
  );
}

export function PlaceMenu({
  placeables,
  onClose,
}: {
  placeables: Placeable[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="pointer-events-auto p-4 bg-black/80 w-64 rounded shadow absolute right-4 top-16">
        <h2 className="text-lg font-bold mb-2">Placeables</h2>
        <div className="flex flex-row flex-wrap gap-2">
          {placeables.map((placeable) => (
            <PlaceableComponent
              key={placeable.id}
              placeable={placeable}
              onSelect={onClose}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
