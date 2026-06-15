export interface AnimationDefinition {
  key: string;
  texture: string;
  startFrame: number;
  endFrame: number;
  frameRate: number;
  repeat: number;
}

export interface AnimationGateway {
  exists(key: string): boolean;
  create(definition: AnimationDefinition): void;
}
