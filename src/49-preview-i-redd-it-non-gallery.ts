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

    const entry = thing.querySelector(".entry");
    entry?.appendChild(box);

    return box;
  }

  function triggerImageDownload(url: string, title: string): void {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType: "blob",
      onload: (res) => {
        const blob = res.response;
        const objectUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = HelperFunctions.buildFilename(title, url);

        document.body.appendChild(a);
        a.click();

        URL.revokeObjectURL(objectUrl);
        a.remove();
      },
      onerror: (err) => {
        console.error("Download failed", err);
      }
    });
  }

  function createImageWithDownload(
    thing: HTMLElement,
    imgUrl: string
  ): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "re-image-wrapper";

    const img = document.createElement("img");
    img.src = imgUrl;
    img.style.maxWidth = "800px";
    img.style.maxHeight = "800px";
    img.style.height = "auto";

    const title =
      thing.querySelector<HTMLAnchorElement>("a.title")?.textContent ??
      "reddit-image";

    const download = document.createElement("a");
    download.className = "re-download-button";
    download.textContent = "⬇";

    download.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerImageDownload(imgUrl, title);
    });

    wrapper.appendChild(download);
    wrapper.appendChild(img);

    return wrapper;
  }

  function toggleRedditImagePreview(
    thing: HTMLElement,
    button: HTMLElement
  ): void {
    const box = getExpandoBox(thing);

    if (box.childElementCount > 0) {
      box.innerHTML = "";
      box.style.marginTop = "0px";
      button.textContent = "▶ Preview";
      return;
    }

    const link = thing.querySelector<HTMLAnchorElement>("a.title");
    if (!link) return;

    const imgWithDownload = createImageWithDownload(thing, link.href);
    box.appendChild(imgWithDownload);

    box.style.marginTop = "8px";
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

  function injectPreviewStyles(): void {
    if (document.getElementById("re-preview-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "re-preview-styles";
    style.textContent = `
    .re-image-wrapper {
      position: relative;
      display: inline-block;
    }

    .re-download-button {
      position: absolute;
      top: 6px;
      left: 6px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 6px;
      font-size: 12px;
      border-radius: 3px;
      cursor: pointer;
      text-decoration: none;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .re-image-wrapper:hover .re-download-button {
      opacity: 1;
    }
  `;
    document.head.appendChild(style);
  }

  export class Preview implements PreviewFactory.MediaHandler {
    init(): void {
      console.log("Initializing i.redd.it non-gallery post preview. Registering needed styles.");
      injectPreviewStyles();
    }

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