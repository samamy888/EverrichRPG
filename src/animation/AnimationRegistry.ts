import type {
  AnimationDefinition,
  AnimationGateway
} from "./AnimationDefinition";

export class AnimationRegistry {
  constructor(private readonly gateway: AnimationGateway) {}

  register(definitions: readonly AnimationDefinition[]): void {
    for (const definition of definitions) {
      if (this.gateway.exists(definition.key)) continue;
      this.gateway.create(definition);
    }
  }
}
