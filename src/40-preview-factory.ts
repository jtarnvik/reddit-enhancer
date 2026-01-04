namespace PreviewFactory {
  export interface MediaHandler {
    name(): string;

    canHandle(node: HTMLElement): boolean;

    adjustWithREPreview(thing: HTMLElement): void;
  }

  export class Factory implements MediaHandler{
    private handlers: MediaHandler[];

    constructor() {
      this.handlers = [];
    }

    name(): string {
      return "PreviewFactory";
    }

    registerMediaHandler(handler: MediaHandler) {
      console.log(`Registered media handler: ${handler.name()}`);
      this.handlers.push(handler);
    }

    canHandle(node: HTMLElement): boolean {
      return this.handlers.some(handler => handler.canHandle(node));
    }

    adjustWithREPreview(thing: HTMLElement): boolean {
      if (!this.canHandle(thing)) {
        return false;
      }

      this.handlers.find(handler => handler.canHandle(thing))?.adjustWithREPreview(thing);
      return true;
    }
  }

  export const factory = new Factory();
}