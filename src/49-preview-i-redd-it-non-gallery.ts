namespace PreviewIReddItNonGallery {
  function suppressRedditExpando(thing: HTMLElement): void {
    thing
      .querySelectorAll(".expando-button")
      .forEach(el => el.remove());
  }

  function getExpandoBox(thing: HTMLElement): HTMLElement {
    let box = thing.querySelector(".re-expando-box") as HTMLElement;
    if (box) return box;

    box = document.createElement("div");
    box.className = "re-expando-box";
    box.style.marginTop = "8px";

    const entry = thing.querySelector(".entry");
    entry?.appendChild(box);

    return box;
  }

  function toggleRedditImagePreview(
    thing: HTMLElement,
    button: HTMLElement
  ): void {
    const box = getExpandoBox(thing);

    if (box.childElementCount > 0) {
      box.innerHTML = "";
      button.textContent = "▶ Preview";
      return;
    }

    const link = thing.querySelector<HTMLAnchorElement>("a.title");
    if (!link) return;

    const img = document.createElement("img");
    img.src = link.href;
    // img.style.maxWidth = "100%";
    img.style.maxWidth = "800px";
    img.style.maxHeight = "800px";
    img.style.height = "auto";
    
    box.appendChild(img);
    button.textContent = "▼ Hide";
  }

  function addPreviewButton(thing: HTMLElement): void {
    if (thing.querySelector(".re-expando-button")) return;

    const button = document.createElement("button");
    button.className = "re-expando-button";
    button.textContent = "▶ Preview";

    button.addEventListener("click", () =>
      toggleRedditImagePreview(thing, button)
    );

    const buttons = thing.querySelector(".entry .buttons");
    buttons?.prepend(button);
  }

  export class Preview implements PreviewFactory.MediaHandler{
    adjustWithREPreview(thing: HTMLElement, previewInfo: PreviewFactory.PreviewInfo | null): void {
      console.log("Adjusting i.redd.it non-gallery post");
      suppressRedditExpando(thing);
      getExpandoBox(thing);
      addPreviewButton(thing);
    }

    canHandle(node: HTMLElement): boolean {
      return (
        node.dataset.domain === "i.redd.it" &&
        node.dataset.isGallery === "false"
      );
    }

    name(): string {
      return "PreviewIReddItNonGallery";
    }

    createPreviewInfo(things: HTMLElement[]): PreviewFactory.PreviewInfo | null {
      console.log("Method not implemented.");
      return null;
    }
  }

  PreviewFactory.factory.registerMediaHandler(new Preview());
}