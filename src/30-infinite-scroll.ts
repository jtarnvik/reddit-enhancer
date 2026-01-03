namespace InfiniteScroll {
  let nextAfter: string | null = null;
  let nextCount = 0;
  let isLoadingNextPage = false;
  let currentPage = 1;
  let scrollUiContainer: HTMLElement;
  let loadingEl: HTMLElement | null = null;
  let infiniteObserver: IntersectionObserver | null = null;

  function ensureScrollUiContainer(): HTMLElement {
    if (scrollUiContainer) {
      return scrollUiContainer;
    }

    scrollUiContainer = document.createElement("div");
    scrollUiContainer.id = "re-enhancer-scroll-ui";
    scrollUiContainer.style.textAlign = "center";
    scrollUiContainer.style.padding = "16px";
    scrollUiContainer.style.color = "#888";

    const siteTable = document.getElementById("siteTable");
    siteTable?.after(scrollUiContainer);

    return scrollUiContainer;
  }

  function showLoading(): void {
    if (loadingEl) {
      return;
    }

    const container = ensureScrollUiContainer();

    loadingEl = document.createElement("div");
    loadingEl.innerHTML = `
    <div class="re-spinner"></div>
    <div>Loading more posts…</div>
  `;

    container.appendChild(loadingEl);
  }

  function hideLoading(): void {
    loadingEl?.remove();
    loadingEl = null;
  }

  export function injectStyles(): void {
    if (document.getElementById("re-enhancer-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "re-enhancer-styles";
    style.textContent = `
    .re-spinner {
      width: 24px;
      height: 24px;
      margin: 0 auto 8px;
      border: 3px solid #ccc;
      border-top-color: #ff4500;
      border-radius: 50%;
      animation: re-spin 0.8s linear infinite;
    }

    @keyframes re-spin {
      to { transform: rotate(360deg); }
    }
  `;
    document.head.appendChild(style);
  }

  function addPageMarker(page: number): void {
    const siteTable = document.getElementById("siteTable");
    const sentinel = document.getElementById("re-infinite-sentinel");

    const marker = document.createElement("div");
    marker.textContent = `— Page ${page} —`;
    marker.style.marginTop = "6px";
    marker.style.marginBottom = "6px";
    marker.style.fontSize = "12px";
    marker.style.textAlign = "center";
    marker.style.backgroundColor = "#f0f3fc";
    marker.style.color = "#7f7f7f";
    marker.style.borderStyle = "solid";
    marker.style.borderWidth = "1px";
    marker.style.borderColor = "#c7c7c7";
    marker.style.borderRadius = "3px";
    marker.style.padding = "4px 0px";

    siteTable?.insertBefore(marker, sentinel ?? null);
  }

  export function initPaginationState(): void {
    const things = document.querySelectorAll<HTMLElement>("#siteTable .thing");
    if (things.length === 0) {
      return;
    }

    const lastThing = things[things.length - 1];

    const fullname = lastThing.getAttribute("data-fullname");
    if (!fullname) {
      console.warn("Missing data-fullname; stopping infinite scroll");
      nextAfter = null;
      return;
    }
    nextAfter = fullname;
    nextCount = things.length;
  }

  function appendNextPage(html: string): void {
    const container = document.createElement("div");
    container.innerHTML = html;

    const newThings = container.querySelectorAll<HTMLElement>("#siteTable .thing");

    if (newThings.length === 0) {
      // No more content
      nextAfter = null;
      if (infiniteObserver) {
        infiniteObserver.disconnect();
      }

      return;
    }

    const siteTable = document.getElementById("siteTable");
    const sentinel = document.getElementById("re-infinite-sentinel");

    newThings.forEach((thing) => {
      siteTable?.insertBefore(thing, sentinel ?? null);
    });

    // Update pagination state
    const lastThing = newThings[newThings.length - 1];
    const fullname = lastThing.getAttribute("data-fullname");
    if (!fullname) {
      console.warn("Missing data-fullname; stopping infinite scroll");
      nextAfter = null;
      return;
    }
    nextAfter = fullname;
    nextCount += newThings.length;
  }

  async function loadNextPage(): Promise<void> {
    if (isLoadingNextPage || !nextAfter) {
      return;
    }

    isLoadingNextPage = true;
    showLoading();

    const url = new URL(window.location.href);
    url.searchParams.set("after", nextAfter);
    url.searchParams.set("count", String(nextCount));

    try {
      const response = await fetch(url.toString(), {credentials: "same-origin",});

      if (!response.ok) {
        console.warn("Failed to load next page");
        return;
      }

      const html = await response.text();
      addPageMarker(++currentPage);
      appendNextPage(html);
    } finally {
      hideLoading();
      isLoadingNextPage = false;
    }
  }

  function shouldEnableInfiniteScroll(): boolean {
    // Hard stop: comment pages
    if (location.pathname.includes("/comments/")) {
      return false;
    }

    // Defensive fallback
    const things = document.querySelectorAll("#siteTable .thing");
    return things.length > 1;
  }

  export function setupInfiniteScroll(): void {
    if (!shouldEnableInfiniteScroll()) {
      console.log("Infinite scroll disabled on this page");
      return;
    }

    const siteTable = document.getElementById("siteTable");
    if (!siteTable) {
      return;
    }

    const navButtons = document.querySelector<HTMLElement>("#siteTable .nav-buttons");
    if (navButtons) {
      navButtons.remove();
    }

    const sentinel = document.createElement("div");
    sentinel.id = "re-infinite-sentinel";
    sentinel.style.height = "1px";

    siteTable.appendChild(sentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      {
        rootMargin: "800px", // start loading before user hits bottom
      }
    );
    infiniteObserver = observer;
    observer.observe(sentinel);
  }
}
