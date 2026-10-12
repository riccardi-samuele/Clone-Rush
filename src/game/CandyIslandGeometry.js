import contour from './candy-island-contour.json' with { type: 'json' };

export const ISLAND_PROFILE = Object.freeze(contour.profile);
export function islandStripLayout(platform) {
  const { x, end, walk, left, right, feather } = ISLAND_PROFILE;
  const scale = platform.undersideSupport ? 20 / 217 : .1;
  const width = platform.width + 12, start = platform.x - 6;
  return { scale, width, start, top: platform.y - walk * scale,
    leftWidth: (left - x) * scale, rightWidth: (end - right) * scale,
    rightStart: start + width - (end - right + feather) * scale };
}

export function islandUndersideAt(platform, worldX) {
  const { x, end, walk, left, right, feather } = ISLAND_PROFILE;
  const { scale, start, width, leftWidth, rightWidth, rightStart } = islandStripLayout(platform);
  const samples = [];
  const sample = sourceX => contour.bottom[Math.max(0, Math.min(contour.bottom.length - 1, Math.floor(sourceX) - x))];
  if (worldX <= start + leftWidth + feather * scale) samples.push(sample(x + (worldX - start) / scale));
  if (worldX >= rightStart) samples.push(sample(right - feather + (worldX - rightStart) / scale));
  const middleStart = start + leftWidth;
  if (worldX >= middleStart && worldX <= start + width - rightWidth + scale) {
    samples.push(sample(left + ((worldX - middleStart) / scale) % (right - left)));
  }
  return platform.y + (Math.max(...samples) - walk) * scale;
}

const collisionProfiles = new WeakMap();
export function islandCollisionPolygons(platform) {
  if (collisionProfiles.has(platform)) return collisionProfiles.get(platform);
  const polygons = [];
  for (let x = platform.x; x < platform.x + platform.width; x += 4) {
    const next = Math.min(x + 4, platform.x + platform.width);
    polygons.push([{ x, y: platform.y }, { x: next, y: platform.y },
      { x: next, y: islandUndersideAt(platform, next) }, { x, y: islandUndersideAt(platform, x) }]);
  }
  collisionProfiles.set(platform, polygons);
  return polygons;
}

// Minimum centre Y that keeps the rounded head outside this ceiling. Use the
// exact same piecewise linear boundary as Matter's convex terrain parts.
export function islandCeilingContactY(platform, body) {
  const parts = islandCollisionPolygons(platform);
  let target = -Infinity;
  const vertices = body.vertices;
  for (let x = Math.max(body.bounds.min.x, platform.x); x <= Math.min(body.bounds.max.x, platform.x + platform.width); x += .5) {
    let head = Infinity;
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i], b = vertices[(i + 1) % vertices.length];
      if (a.x === b.x || x < Math.min(a.x, b.x) || x > Math.max(a.x, b.x)) continue;
      head = Math.min(head, a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x) - body.position.y);
    }
    const segment = parts[Math.min(parts.length - 1, Math.floor((x - platform.x) / 4))];
    const a = segment[3], b = segment[2];
    const underside = a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
    target = Math.max(target, underside - head);
  }
  return target;
}
