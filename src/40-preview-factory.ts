namespace PreviewFactory {
  export interface PreviewInfo {
  }

  export interface MediaHandler {
    name(): string;

    canHandle(node: HTMLElement): boolean;

    adjustWithREPreview(thing: HTMLElement, previewInfo: PreviewInfo | null): void;

    createPreviewInfo(things: HTMLElement[]): PreviewInfo | null;
  }

  function logElementsThings(str: string, things: Element[]) {
    const ids = things.map(thing => thing.getAttribute("data-fullname"));
    console.log(`${str}: Found ${ids.length} elements: ${ids.join(", ")}`);
  }

  export class ByHandler {
    private readonly mediaHandler: MediaHandler;
    private readonly nodes: HTMLElement[] = [];

    constructor(mediaHandler: MediaHandler) {
      this.mediaHandler = mediaHandler;
    }

    get handler(): MediaHandler {
      return this.mediaHandler;
    }

    addNode(node: HTMLElement) {
      this.nodes.push(node);
    }

    adjustPreview() {
      logElementsThings("Adjusting preview", this.nodes);
      const previewInfo = this.mediaHandler.createPreviewInfo(this.nodes);
      this.nodes.forEach(node => this.mediaHandler.adjustWithREPreview(node, previewInfo));
    }
  }

  export class SortedByHandler {
    private readonly byHandler: ByHandler[] = [];

    addNode(node: HTMLElement, handler: MediaHandler) {
      for (const itm of this.byHandler) {
        if (handler === itm.handler) {
          itm.addNode(node);
          return
        }
      }
      const itm = new ByHandler(handler);
      itm.addNode(node);
      this.byHandler.push(itm);
    }

    adjustPreview() {
      this.byHandler.forEach(itm => itm.adjustPreview());
    }
  }

  export class Factory {
    private readonly handlers: MediaHandler[];

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

    adjustPreview(things: HTMLElement[]): void {
      const sortedByHandler = new SortedByHandler();

      things.forEach(thing => {
        if (!thing.classList.contains("thing")) {
          return;
        }

        for (const handler of this.handlers) {
          if (handler.canHandle(thing)) {
            sortedByHandler.addNode(thing, handler);
            break;
          }
        }
      });
      sortedByHandler.adjustPreview();
    }
  }

  export const factory = new Factory();
}