import { useStore } from "@nanostores/react";
import { $selectedObjects } from "@/game/editor/state";
import { getSchemaComponent } from "./schemaRegistry";
import { LevelObject } from "@/game/objects/levelObject";
import z from "zod";
import { useCallback, useSyncExternalStore } from "react";
import "./fieldComponents";

export function ObjectPropertyEditor() {
  const selectedObjects = useStore($selectedObjects);

  // Only show editor for exactly one selected object
  if (selectedObjects.length !== 1) return null;

  const obj = selectedObjects[0];
  if (!obj || !(obj instanceof LevelObject)) return null;

  const schema = obj.schema;
  const shape = schema.shape ?? {};

  return (
    <div className="flex flex-col gap-2 text-xs">
      {Object.entries(shape).map(([key, fieldSchema]) => {
        return (
          <PropertyField
            key={key}
            fieldKey={key}
            fieldSchema={fieldSchema as z.ZodTypeAny}
            object={obj}
          />
        );
      })}
    </div>
  );
}

function useObjectData(object: LevelObject, fieldKey: string) {
  return useSyncExternalStore(
    (callback) => {
      const onChange = () => callback();
      const off = object.on(fieldKey as any, onChange);
      return () => off();
    },
    () => (object.getData() as Record<string, unknown>)[fieldKey],
    () => (object.getData() as Record<string, unknown>)[fieldKey],
  );
}

function PropertyField({
  fieldKey,
  fieldSchema,
  object,
}: {
  fieldKey: string;
  fieldSchema: z.ZodTypeAny;
  object: LevelObject;
}) {
  const value = useObjectData(object, fieldKey);
  const FieldComp = getSchemaComponent(fieldSchema);

  const handleChange = useCallback(
    (newValue: unknown) => {
      // Use the object's type-safe set method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (object.set as any)(fieldKey, newValue);
    },
    [object, fieldKey],
  );

  if (fieldKey === "id") {
    return <div className="text-gray-500 italic">ID: {value as string}</div>;
  }

  if (!FieldComp) {
    return null;
  }

  return (
    <div className="">
      <label className="text-gray-300 flex items-center justify-between gap-2">
        {fieldKey}
        <FieldComp
          value={value}
          onChange={handleChange}
          schema={fieldSchema}
          object={object}
          key={fieldKey}
        />
      </label>
    </div>
  );
}
