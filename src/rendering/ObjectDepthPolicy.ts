export interface ObjectDepthInput {
  baselineY: number;
  foreground?: boolean;
  depthOffset?: number;
}

export const resolveObjectDepth = (object: ObjectDepthInput): number =>
  object.baselineY + (object.foreground ? 10 : 0) + (object.depthOffset ?? 0);
