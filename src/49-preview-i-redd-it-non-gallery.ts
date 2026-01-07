namespace PreviewIReddItNonGallery {

  export interface LocalPreviewInfo extends PreviewFactory.PreviewInfo{
    byFullname: Map<string, RedditApi.RedditPost >;
    ready: Promise<void>;
    get(fullname: string): RedditApi.RedditPost | undefined;
  }

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

  async function toggleRedditImagePreview(
    thing: HTMLElement,
    button: HTMLElement,
    localPreview: LocalPreviewInfo
  ): Promise<void> {
    await localPreview.ready;
    const post = localPreview.get(thing.getAttribute("data-fullname")!);

    const description =
      post?.preview?.images?.[0]?.caption ??
      post?.media_metadata?.[Object.keys(post.media_metadata ?? {})[0]]?.caption ??
      post?.selftext ??
      post?.title;

    console.log( "description", description);
    // continue by presenting this!

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

  function addPreviewButton(thing: HTMLElement, localPreview: LocalPreviewInfo): void {
    if (thing.querySelector(".re-expando-button")) return;

    const button = document.createElement("button");
    button.className = "re-expando-button";
    button.textContent = "▶ Preview";

    button.addEventListener("click", () =>
      toggleRedditImagePreview(thing, button, localPreview)
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
      injectPreviewStyles();
    }

    adjustWithREPreview(thing: HTMLElement, previewInfo: PreviewFactory.PreviewInfo | null): void {
      suppressRedditExpando(thing);
      getExpandoBox(thing);

      if (!previewInfo) {
        addPreviewButton(thing, {byFullname: new Map(), ready: Promise.resolve(), get: () => undefined});
        return;
      }

      console.log( "previewInfo", previewInfo);
      addPreviewButton(thing, previewInfo as LocalPreviewInfo);
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
      const ids: string[] = [];

      for (const thing of things) {
        const fullname = thing.getAttribute("data-fullname");
        if (fullname) {
          ids.push(fullname);
        }
      }

      if (ids.length === 0) {
        return null;
      }

      const combined = ids.join(",");
      const url = `https://www.reddit.com/by_id/${combined}.json?raw_json=1`;

      const byFullname = new Map<string, RedditApi.RedditPost>();

      const ready = (async () => {
        const response = await fetch(url, { credentials: "omit" });
        if (!response.ok) {
          throw new Error("Failed to fetch preview metadata");
        }

        const json = (await response.json()) as RedditApi.RedditListing;

        console.log("Got preview metadata, setting up result!");
        for (const child of json.data.children) {
          if (child.kind !== "t3") continue;
          byFullname.set(child.data.name, child.data);
        }
      })();

      return {
        byFullname,
        ready,
        get(fullname: string) {
          return byFullname.get(fullname);
        }
      };
    }

  }

  PreviewFactory.factory.registerMediaHandler(new Preview());
}
