import { ansiGraphemeEvents, graphemeWidth, resetHyperlink } from './ansi.js';
import { height, width } from './size.js';
import { SgrState } from './sgr.js';

export interface Rectangle {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Cell {
  content: string;
  style?: string;
  link?: { url: string; params: string };
  /** Internal marker for the second cell occupied by a wide grapheme. */
  continuation?: boolean;
}

export interface Screen {
  bounds(): Rectangle;
  cellAt(x: number, y: number): Cell | undefined;
  setCell(x: number, y: number, cell: Cell | undefined): void;
}

export interface Drawable {
  draw(screen: Screen, area: Rectangle): void;
}

function rectangle(minX: number, minY: number, maxX: number, maxY: number): Rectangle {
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

function union(left: Rectangle, right: Rectangle): Rectangle {
  return rectangle(
    Math.min(left.minX, right.minX),
    Math.min(left.minY, right.minY),
    Math.max(left.maxX, right.maxX),
    Math.max(left.maxY, right.maxY),
  );
}

function overlaps(left: Rectangle, right: Rectangle): boolean {
  return left.minX < right.maxX && right.minX < left.maxX &&
    left.minY < right.maxY && right.minY < left.maxY;
}

function drawStyledString(content: string, screen: Screen, area: Rectangle): void {
  let x = area.minX;
  let y = area.minY;
  const sgr = new SgrState();
  let link = { url: '', params: '' };
  const applyControl = (control: string): void => {
    sgr.apply(control);
    const match = /^(?:\x1b\]|\x9d)8;([^;]*);(.*?)(?:\x07|\x1b\\|\x9c)$/.exec(control);
    if (match) link = match[2] ? { params: match[1], url: match[2] } : { url: '', params: '' };
  };

  for (const event of ansiGraphemeEvents(content)) {
    if (event.kind === 'ansi') {
      applyControl(event.value);
      continue;
    }
    if (event.value === '\n') {
      x = area.minX;
      y++;
      continue;
    }

    const cellStyle = sgr.toString() || undefined;
    const cellLink = link.url ? { ...link } : undefined;
    for (const part of event.parts) {
      if (part.ansi) applyControl(part.value);
    }
    if (event.width === 0) {
      let priorX = x - 1;
      let prior = screen.cellAt(priorX, y);
      while (prior?.continuation && priorX > area.minX) {
        prior = screen.cellAt(--priorX, y);
      }
      if (prior) prior.content += event.value;
      continue;
    }
    if (x >= area.minX && x < area.maxX && y >= area.minY && y < area.maxY) {
      screen.setCell(x, y, {
        content: event.value,
        style: cellStyle,
        link: cellLink,
      });
    }
    x += event.width;
  }
}

/** Mutable cell buffer for composing styled drawables. */
export class Canvas implements Screen, Drawable {
  private cells: Cell[][] = [];
  private canvasWidth = 0;
  private canvasHeight = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.resize(canvasWidth, canvasHeight);
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    const nextWidth = Math.max(0, Math.trunc(canvasWidth));
    const nextHeight = Math.max(0, Math.trunc(canvasHeight));
    const next = Array.from({ length: nextHeight }, (_, y) =>
      Array.from({ length: nextWidth }, (_, x) => this.cells[y]?.[x] ?? { content: '' }),
    );
    this.canvasWidth = nextWidth;
    this.canvasHeight = nextHeight;
    this.cells = next;
  }

  clear(): void {
    for (let y = 0; y < this.canvasHeight; y++) {
      for (let x = 0; x < this.canvasWidth; x++) this.cells[y][x] = { content: '' };
    }
  }

  bounds(): Rectangle {
    return rectangle(0, 0, this.canvasWidth, this.canvasHeight);
  }

  width(): number {
    return this.canvasWidth;
  }

  height(): number {
    return this.canvasHeight;
  }

  widthMethod(): typeof graphemeWidth {
    return graphemeWidth;
  }

  cellAt(x: number, y: number): Cell | undefined {
    if (x < 0 || y < 0 || x >= this.canvasWidth || y >= this.canvasHeight) return undefined;
    return this.cells[y][x];
  }

  setCell(x: number, y: number, cell: Cell | undefined): void {
    if (x < 0 || y < 0 || x >= this.canvasWidth || y >= this.canvasHeight) return;
    const row = this.cells[y];
    const previous = row[x];
    if (previous.continuation) {
      for (let offset = 1; offset <= 5 && x - offset >= 0; offset++) {
        const wide = row[x - offset];
        const cells = graphemeWidth(wide.content);
        if (cells > 1 && offset < cells) {
          for (let index = 0; index < cells && x - offset + index < row.length; index++) {
            row[x - offset + index] = { content: ' ' };
          }
          break;
        }
      }
    } else {
      const cells = graphemeWidth(previous.content);
      if (cells > 1) {
        for (let index = 0; index < cells && x + index < row.length; index++) {
          row[x + index] = { content: ' ' };
        }
      }
    }
    if (!cell) {
      row[x] = { content: ' ' };
      return;
    }
    const cells = graphemeWidth(cell.content);
    row[x] = { ...cell, continuation: false };
    if (cells > 1 && x + cells > row.length) {
      for (let index = 0; index < cells && x + index < row.length; index++) {
        row[x + index] = { content: ' ' };
      }
      return;
    }
    for (let index = 1; index < cells; index++) row[x + index] = { content: '', continuation: true };
  }

  compose(drawable: Drawable): this {
    drawable.draw(this, this.bounds());
    return this;
  }

  draw(screen: Screen, area: Rectangle): void {
    for (let y = 0; y < this.canvasHeight && area.minY + y < area.maxY; y++) {
      for (let x = 0; x < this.canvasWidth && area.minX + x < area.maxX; x++) {
        const cell = this.cells[y][x];
        if (!cell.continuation) screen.setCell(area.minX + x, area.minY + y, cell);
      }
    }
  }

  render(): string {
    return this.cells.map(row => {
      let last = row.length - 1;
      while (last >= 0) {
        const cell = row[last];
        if (cell.continuation || ((cell.content === '' || cell.content === ' ') && !cell.style && !cell.link)) last--;
        else break;
      }
      let output = '';
      let activeStyle = '';
      let activeLink = { url: '', params: '' };
      for (let x = 0; x <= last; x++) {
        const cell = row[x];
        if (cell.continuation) continue;
        const nextLink = cell.link ?? { url: '', params: '' };
        if (nextLink.url !== activeLink.url || nextLink.params !== activeLink.params) {
          if (activeLink.url) output += resetHyperlink();
          if (nextLink.url) output += `\x1b]8;${nextLink.params};${nextLink.url}\x1b\\`;
          activeLink = nextLink;
        }
        const nextStyle = cell.style ?? '';
        if (nextStyle !== activeStyle) {
          if (activeStyle) output += '\x1b[0m';
          output += nextStyle;
          activeStyle = nextStyle;
        }
        output += cell.content || ' ';
      }
      if (activeStyle) output += '\x1b[0m';
      if (activeLink.url) output += resetHyperlink();
      return output;
    }).join('\n');
  }
}

export function newCanvas(canvasWidth: number, canvasHeight: number): Canvas {
  return new Canvas(canvasWidth, canvasHeight);
}

/** Pure layer data with relative position and child hierarchy. */
export class Layer implements Drawable {
  private layerId = '';
  private layerX = 0;
  private layerY = 0;
  private layerZ = 0;
  private layerWidth = 0;
  private layerHeight = 0;
  private readonly layers: Layer[] = [];

  constructor(private readonly content: string, ...layers: Layer[]) {
    this.addLayers(...layers);
  }

  getContent(): string {
    return this.content;
  }

  width(): number {
    return this.layerWidth;
  }

  height(): number {
    return this.layerHeight;
  }

  getID(): string {
    return this.layerId;
  }

  id(value: string): this {
    this.layerId = value;
    return this;
  }

  x(value: number): this {
    this.layerX = Math.trunc(value);
    return this;
  }

  y(value: number): this {
    this.layerY = Math.trunc(value);
    return this;
  }

  z(value: number): this {
    this.layerZ = Math.trunc(value);
    return this;
  }

  getX(): number {
    return this.layerX;
  }

  getY(): number {
    return this.layerY;
  }

  getZ(): number {
    return this.layerZ;
  }

  addLayers(...layers: Layer[]): this {
    for (let index = 0; index < layers.length; index++) {
      if (!layers[index]) throw new TypeError(`layer at index ${index} is undefined`);
      this.layers.push(layers[index]);
    }
    const area = this.boundsWithOffset(0, 0);
    this.layerWidth = area.width;
    this.layerHeight = area.height;
    return this;
  }

  getLayer(id: string): Layer | undefined {
    if (!id) return undefined;
    if (this.layerId === id) return this;
    for (const child of this.layers) {
      const found = child.getLayer(id);
      if (found) return found;
    }
    return undefined;
  }

  maxZ(): number {
    let result = this.layerZ;
    for (const child of this.layers) result = Math.max(result, child.maxZ());
    return result;
  }

  draw(screen: Screen, area: Rectangle): void {
    for (let y = area.minY; y < area.maxY; y++) {
      for (let x = area.minX; x < area.maxX; x++) screen.setCell(x, y, undefined);
    }
    drawStyledString(this.content, screen, area);
  }

  boundsWithOffset(parentX: number, parentY: number): Rectangle {
    const absoluteX = this.layerX + parentX;
    const absoluteY = this.layerY + parentY;
    let result = rectangle(
      absoluteX,
      absoluteY,
      absoluteX + width(this.content),
      absoluteY + height(this.content),
    );
    for (const child of this.layers) {
      result = union(result, child.boundsWithOffset(absoluteX, absoluteY));
    }
    return result;
  }

  children(): readonly Layer[] {
    return this.layers;
  }
}

export function newLayer(content: string, ...layers: Layer[]): Layer {
  return new Layer(content, ...layers);
}

export class LayerHit {
  constructor(
    private readonly hitId = '',
    private readonly hitLayer?: Layer,
    private readonly hitBounds = rectangle(0, 0, 0, 0),
  ) {}

  empty(): boolean {
    return this.hitLayer === undefined;
  }

  id(): string {
    return this.hitId;
  }

  layer(): Layer | undefined {
    return this.hitLayer;
  }

  bounds(): Rectangle {
    return this.hitBounds;
  }
}

interface CompositeLayer {
  layer: Layer;
  absoluteX: number;
  absoluteY: number;
  bounds: Rectangle;
}

export class Compositor implements Drawable {
  private readonly root = new Layer('');
  private flattened: CompositeLayer[] = [];
  private index: Record<string, Layer> = Object.create(null) as Record<string, Layer>;
  private compositorBounds = rectangle(0, 0, 0, 0);

  constructor(...layers: Layer[]) {
    this.root.addLayers(...layers);
    this.flatten();
  }

  addLayers(...layers: Layer[]): this {
    this.root.addLayers(...layers);
    this.flatten();
    return this;
  }

  bounds(): Rectangle {
    return this.compositorBounds;
  }

  draw(screen: Screen, area: Rectangle): void {
    for (const composite of this.flattened) {
      if (overlaps(composite.bounds, area)) composite.layer.draw(screen, composite.bounds);
    }
  }

  hit(x: number, y: number): LayerHit {
    for (let index = this.flattened.length - 1; index >= 0; index--) {
      const composite = this.flattened[index];
      const bounds = composite.bounds;
      if (composite.layer.getID() && x >= bounds.minX && x < bounds.maxX && y >= bounds.minY && y < bounds.maxY) {
        return new LayerHit(composite.layer.getID(), composite.layer, bounds);
      }
    }
    return new LayerHit();
  }

  getLayer(id: string): Layer | undefined {
    return id ? this.index[id] : undefined;
  }

  refresh(): void {
    this.flatten();
  }

  render(): string {
    const bounds = this.compositorBounds;
    const canvas = new Canvas(bounds.width, bounds.height);
    const translated: Screen = {
      bounds: () => bounds,
      cellAt: (x, y) => canvas.cellAt(x - bounds.minX, y - bounds.minY),
      setCell: (x, y, cell) => canvas.setCell(x - bounds.minX, y - bounds.minY, cell),
    };
    this.draw(translated, bounds);
    return canvas.render();
  }

  private flatten(): void {
    this.flattened = [];
    this.index = Object.create(null) as Record<string, Layer>;
    this.flattenRecursive(this.root, 0, 0);
    this.flattened.sort((left, right) => left.layer.getZ() - right.layer.getZ());
    if (this.flattened.length === 0) {
      this.compositorBounds = rectangle(0, 0, 0, 0);
      return;
    }
    this.compositorBounds = this.flattened[0].bounds;
    for (let index = 1; index < this.flattened.length; index++) {
      this.compositorBounds = union(this.compositorBounds, this.flattened[index].bounds);
    }
  }

  private flattenRecursive(layer: Layer, parentX: number, parentY: number): void {
    const absoluteX = layer.getX() + parentX;
    const absoluteY = layer.getY() + parentY;
    const bounds = rectangle(
      absoluteX,
      absoluteY,
      absoluteX + width(layer.getContent()),
      absoluteY + height(layer.getContent()),
    );
    this.flattened.push({ layer, absoluteX, absoluteY, bounds });
    if (layer.getID()) this.index[layer.getID()] = layer;
    for (const child of layer.children()) this.flattenRecursive(child, absoluteX, absoluteY);
  }
}

export function newCompositor(...layers: Layer[]): Compositor {
  return new Compositor(...layers);
}
