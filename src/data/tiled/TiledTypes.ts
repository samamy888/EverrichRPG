export interface TiledProperty {
  name: string;
  value: boolean | number | string;
}

export interface TiledObject {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  point?: boolean;
  properties?: TiledProperty[];
}

export interface TiledLayer {
  name: string;
  type: "tilelayer" | "objectgroup";
  width?: number;
  height?: number;
  opacity?: number;
  data?: number[];
  objects?: TiledObject[];
}

export interface TiledTilesetReference {
  firstgid: number;
  source: string;
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTilesetReference[];
  properties?: TiledProperty[];
}

export interface TiledTilesetTile {
  id: number;
  properties?: TiledProperty[];
}

export interface TiledTileset {
  tiles?: TiledTilesetTile[];
}

export type TiledTilesetCollection = ReadonlyMap<string, TiledTileset>;
