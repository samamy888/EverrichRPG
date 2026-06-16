export interface PathPoint {
  x: number;
  y: number;
}

export interface GridPathfinderOptions {
  width: number;
  height: number;
  cellSize: number;
  isBlocked: (x: number, y: number) => boolean;
}

const DIRECTIONS = [
  { x: 0, y: -1, cost: 1 },
  { x: 0, y: 1, cost: 1 },
  { x: -1, y: 0, cost: 1 },
  { x: 1, y: 0, cost: 1 },
  { x: -1, y: -1, cost: Math.SQRT2 },
  { x: 1, y: -1, cost: Math.SQRT2 },
  { x: -1, y: 1, cost: Math.SQRT2 },
  { x: 1, y: 1, cost: Math.SQRT2 }
] as const;

export function findGridPath(
  start: PathPoint,
  destination: PathPoint,
  options: GridPathfinderOptions
): PathPoint[] {
  const columns = Math.floor(options.width / options.cellSize);
  const rows = Math.floor(options.height / options.cellSize);
  const startCell = toCell(start, options.cellSize, columns, rows);
  const destinationCell = findNearestOpenCell(
    toCell(destination, options.cellSize, columns, rows),
    columns,
    rows,
    options
  );
  if (!destinationCell) return [];

  const startKey = key(startCell.x, startCell.y);
  const destinationKey = key(destinationCell.x, destinationCell.y);
  if (startKey === destinationKey) return [];

  const open = new Map<string, SearchNode>();
  const closed = new Set<string>();
  const parents = new Map<string, string>();
  const costs = new Map<string, number>([[startKey, 0]]);
  open.set(startKey, {
    ...startCell,
    score: heuristic(startCell, destinationCell)
  });

  while (open.size > 0) {
    const current = [...open.values()].reduce((best, candidate) =>
      candidate.score < best.score ? candidate : best
    );
    const currentKey = key(current.x, current.y);
    open.delete(currentKey);

    if (currentKey === destinationKey) {
      return reconstructPath(
        parents,
        startKey,
        destinationKey,
        options.cellSize
      );
    }
    closed.add(currentKey);

    for (const direction of DIRECTIONS) {
      const next = {
        x: current.x + direction.x,
        y: current.y + direction.y
      };
      const nextKey = key(next.x, next.y);
      if (
        next.x < 0 ||
        next.y < 0 ||
        next.x >= columns ||
        next.y >= rows ||
        closed.has(nextKey) ||
        isCellBlocked(next, options)
      ) {
        continue;
      }
      if (
        direction.x !== 0 &&
        direction.y !== 0 &&
        (isCellBlocked({ x: current.x + direction.x, y: current.y }, options) ||
          isCellBlocked({ x: current.x, y: current.y + direction.y }, options))
      ) {
        continue;
      }

      const nextCost = (costs.get(currentKey) ?? 0) + direction.cost;
      if (nextCost >= (costs.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }

      parents.set(nextKey, currentKey);
      costs.set(nextKey, nextCost);
      open.set(nextKey, {
        ...next,
        score: nextCost + heuristic(next, destinationCell)
      });
    }
  }

  return [];
}

interface GridCell {
  x: number;
  y: number;
}

interface SearchNode extends GridCell {
  score: number;
}

function findNearestOpenCell(
  destination: GridCell,
  columns: number,
  rows: number,
  options: GridPathfinderOptions
): GridCell | null {
  if (!isCellBlocked(destination, options)) return destination;

  for (let radius = 1; radius <= 5; radius += 1) {
    for (let y = destination.y - radius; y <= destination.y + radius; y += 1) {
      for (let x = destination.x - radius; x <= destination.x + radius; x += 1) {
        if (
          x < 0 ||
          y < 0 ||
          x >= columns ||
          y >= rows ||
          (Math.abs(x - destination.x) !== radius &&
            Math.abs(y - destination.y) !== radius)
        ) {
          continue;
        }
        const cell = { x, y };
        if (!isCellBlocked(cell, options)) return cell;
      }
    }
  }
  return null;
}

function reconstructPath(
  parents: ReadonlyMap<string, string>,
  startKey: string,
  destinationKey: string,
  cellSize: number
): PathPoint[] {
  const path: PathPoint[] = [];
  let currentKey = destinationKey;

  while (currentKey !== startKey) {
    const [xText, yText] = currentKey.split(",");
    if (xText === undefined || yText === undefined) return [];
    const x = Number(xText);
    const y = Number(yText);
    path.unshift({
      x: x * cellSize + cellSize / 2,
      y: y * cellSize + cellSize / 2
    });
    const parent = parents.get(currentKey);
    if (!parent) return [];
    currentKey = parent;
  }
  return path;
}

function toCell(
  point: PathPoint,
  cellSize: number,
  columns: number,
  rows: number
): GridCell {
  return {
    x: clamp(Math.floor(point.x / cellSize), 0, columns - 1),
    y: clamp(Math.floor(point.y / cellSize), 0, rows - 1)
  };
}

function isCellBlocked(cell: GridCell, options: GridPathfinderOptions): boolean {
  return options.isBlocked(
    cell.x * options.cellSize + options.cellSize / 2,
    cell.y * options.cellSize + options.cellSize / 2
  );
}

function heuristic(left: GridCell, right: GridCell): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
