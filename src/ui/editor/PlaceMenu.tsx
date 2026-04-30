import type {
  Placeable,
  PlaceableGroup,
  PlaceableVariation,
} from "@/game/editor/placeables";
import { $selectedPlaceable, setSelectedPlaceable } from "@/game/editor/state";
import { Icon } from "@iconify/react";
import { useStore } from "@nanostores/react";

function PlaceableNodeComponent({
  node,
  onSelect,
  depth = 0,
}: {
  node: PlaceableVariation;
  onSelect: () => void;
  depth?: number;
}) {
  if ("variations" in node) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          {node.icon ? (
            <Icon
              icon={node.icon}
              width={18}
              height={18}
              style={node.iconColor ? { color: node.iconColor } : undefined}
            />
          ) : null}
          <span>{node.name}</span>
        </div>
        <div
          className={`flex flex-row flex-wrap gap-2 ${depth > 0 ? "pl-4" : ""}`}
        >
          {node.variations.map((variation) => (
            <PlaceableNodeComponent
              key={variation.id}
              node={variation}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    );
  }

  return <PlaceableComponent placeable={node} onSelect={onSelect} />;
}

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
      className={`flex flex-col items-center gap-1 p-2 rounded cursor-pointer text-center ${
        isSelected ? "bg-blue-500 text-white" : "hover:bg-gray-700/50"
      }`}
      onClick={() => {
        setSelectedPlaceable(placeable);
        onSelect();
      }}
      title={placeable.name}
    >
      <Icon
        icon={placeable.icon}
        width={24}
        height={24}
        style={placeable.iconColor ? { color: placeable.iconColor } : undefined}
      />
    </div>
  );
}

export function PlaceMenu({
  placeableGroups,
  onClose,
}: {
  placeableGroups: PlaceableGroup[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="pointer-events-auto absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="pointer-events-auto p-4 bg-black/80 rounded shadow absolute right-4 top-16">
        <h2 className="text-lg font-bold mb-3">Placeables</h2>
        <div className="flex flex-row flex-wrap gap-4">
          {placeableGroups.map((group) => (
            <div key={group.id} className="flex flex-col gap-2 min-w-32">
              <PlaceableNodeComponent node={group} onSelect={onClose} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
