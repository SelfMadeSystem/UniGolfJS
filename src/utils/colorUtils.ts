export type HexColor = `#${string}`;
export type RGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function hexToRGBA(hex: HexColor): RGBA {
  if (hex.length === 4) {
    const r = parseInt(hex[1]! + hex[1], 16);
    const g = parseInt(hex[2]! + hex[2], 16);
    const b = parseInt(hex[3]! + hex[3], 16);
    return { r, g, b, a: 255 };
  } else if (hex.length === 5) {
    const r = parseInt(hex[1]! + hex[1], 16);
    const g = parseInt(hex[2]! + hex[2], 16);
    const b = parseInt(hex[3]! + hex[3], 16);
    const a = parseInt(hex[4]! + hex[4], 16);
    return { r, g, b, a };
  } else if (hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b, a: 255 };
  } else if (hex.length === 9) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = parseInt(hex.slice(7, 9), 16);
    return { r, g, b, a };
  } else {
    throw new Error("Invalid hex color format");
  }
}

export function rgbaToHex({ r, g, b, a }: RGBA): HexColor {
  const alphaHex = a.toString(16).padStart(2, "0");
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}${alphaHex}`;
}

export function blendColors(
  color1: HexColor,
  color2: HexColor,
  alpha: number,
): HexColor {
  const rgba1 = hexToRGBA(color1);
  const rgba2 = hexToRGBA(color2);

  const blended: RGBA = {
    r: Math.round(rgba1.r * (1 - alpha) + rgba2.r * alpha),
    g: Math.round(rgba1.g * (1 - alpha) + rgba2.g * alpha),
    b: Math.round(rgba1.b * (1 - alpha) + rgba2.b * alpha),
    a: Math.round(rgba1.a * (1 - alpha) + rgba2.a * alpha),
  };

  return rgbaToHex(blended);
}
