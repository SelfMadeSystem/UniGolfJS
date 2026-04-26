export type HexColor = `#${string}`;
export type RGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function hexToRGBA(hex: HexColor): RGBA {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
    a: 255,
  };
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
