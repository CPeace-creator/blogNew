export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type GalleryView = Point & { scale: number };
export const MAX_ZOOM = 5;

export function fittedSize(image: Size, frame: Size): Size {
  const ratio = Math.min(1, frame.width / Math.max(1, image.width), frame.height / Math.max(1, image.height));
  return { width: image.width * ratio, height: image.height * ratio };
}
export function clampView(view: GalleryView, frame: Size, image: Size): GalleryView {
  const scale = Math.max(1, Math.min(MAX_ZOOM, view.scale));
  const maxX = Math.max(0, (image.width * scale - frame.width) / 2);
  const maxY = Math.max(0, (image.height * scale - frame.height) / 2);
  return { scale, x: Math.max(-maxX, Math.min(maxX, view.x)), y: Math.max(-maxY, Math.min(maxY, view.y)) };
}
/** Keep the grabbed image point under the cursor or moving pinch midpoint. */
export function gestureView(view: GalleryView, scale: number, from: Point, to: Point, frame: Size, image: Size): GalleryView {
  const boundedScale = Math.max(1, Math.min(MAX_ZOOM, scale));
  const ratio = boundedScale / view.scale;
  return clampView({ scale: boundedScale, x: to.x - (from.x - view.x) * ratio, y: to.y - (from.y - view.y) * ratio }, frame, image);
}
