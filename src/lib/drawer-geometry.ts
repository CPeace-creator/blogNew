export interface WindowRect { x: number; y: number; width: number; height: number }
export interface ViewportSize { width: number; height: number }
export const isSheet = (viewport: ViewportSize) => viewport.width <= 640;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

function limits(viewport: ViewportSize) {
  const margin = Math.min(isSheet(viewport) ? 8 : 12, Math.floor(Math.min(viewport.width, viewport.height) / 4));
  const width = Math.max(1, viewport.width - margin * 2), height = Math.max(1, viewport.height - margin * 2);
  return { margin, width, height, minWidth: Math.min(isSheet(viewport) ? width : 380, width), minHeight: Math.min(280, height) };
}

export function fitWindow(rect: WindowRect, viewport: ViewportSize): WindowRect {
  const limit = limits(viewport);
  const width = isSheet(viewport) ? limit.width : clamp(rect.width, limit.minWidth, limit.width);
  const height = clamp(rect.height, limit.minHeight, limit.height);
  return {
    x: isSheet(viewport) ? limit.margin : clamp(rect.x, limit.margin, viewport.width - width - limit.margin),
    y: isSheet(viewport) ? viewport.height - height - limit.margin : clamp(rect.y, limit.margin, viewport.height - height - limit.margin),
    width, height,
  };
}

export function initialWindow(viewport: ViewportSize): WindowRect {
  const width = Math.min(660, Math.max(440, viewport.width * .48));
  const height = isSheet(viewport) ? viewport.height * .82 : Math.min(720, viewport.height - 104);
  return fitWindow({ x: viewport.width - width - 24, y: 76, width, height }, viewport);
}

export function moveWindow(rect: WindowRect, dx: number, dy: number, viewport: ViewportSize): WindowRect {
  return fitWindow(isSheet(viewport)
    ? { ...rect, height: rect.height - dy }
    : { ...rect, x: rect.x + dx, y: rect.y + dy }, viewport);
}

export function resizeWindow(rect: WindowRect, dx: number, dy: number, viewport: ViewportSize): WindowRect {
  const limit = limits(viewport);
  if (isSheet(viewport)) return fitWindow({ ...rect, height: rect.height + dy }, viewport);
  const safe = fitWindow(rect, viewport);
  return { ...safe,
    width: clamp(safe.width + dx, limit.minWidth, viewport.width - safe.x - limit.margin),
    height: clamp(safe.height + dy, limit.minHeight, viewport.height - safe.y - limit.margin),
  };
}

export function scaleWindow(rect: WindowRect, factor: number, viewport: ViewportSize): WindowRect {
  const width = rect.width * factor, height = rect.height * factor;
  return fitWindow({ x: rect.x - (width - rect.width) / 2, y: rect.y - (height - rect.height) / 2, width, height }, viewport);
}

export function expandedWindow(viewport: ViewportSize): WindowRect {
  const limit = limits(viewport);
  return { x: limit.margin, y: limit.margin, width: limit.width, height: limit.height };
}
