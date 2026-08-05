export function isExactGeometry(geometry) {
  return Array.isArray(geometry) && geometry.length > 2;
}
