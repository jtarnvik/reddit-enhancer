let nextAfter: string | null = null;
let nextCount = 0;
let isLoadingNextPage = false;

//
// Infinate scroll
function initPaginationState(): void {
  const things = document.querySelectorAll<HTMLElement>("#siteTable .thing");
  if (things.length === 0) {
    return;
  }

  const lastThing = things[things.length - 1];

  nextAfter = lastThing.getAttribute("data-fullname");
  nextCount = things.length;
}

function appendNextPage(html: string): void {
  const container = document.createElement("div");
  container.innerHTML = html;

  const newThings = container.querySelectorAll<HTMLElement>("#siteTable .thing");

  if (newThings.length === 0) {
    // No more content
    nextAfter = null;
    return;
  }

  const siteTable = document.getElementById("siteTable");
  const sentinel = document.getElementById("re-infinite-sentinel");

  newThings.forEach((thing) => {
    siteTable?.insertBefore(thing, sentinel ?? null);
  });

  // Update pagination state
  const lastThing = newThings[newThings.length - 1];
  nextAfter = lastThing.getAttribute("data-fullname");
  nextCount += newThings.length;
}

async function loadNextPage(): Promise<void> {
  if (isLoadingNextPage || !nextAfter) {
    return;
  }

  isLoadingNextPage = true;

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
    appendNextPage(html);
  } finally {
    isLoadingNextPage = false;
  }
}

function setupInfiniteScroll(): void {
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

  observer.observe(sentinel);
}

// Infinate scroll
//

function handleChildListMutation(mutation: MutationRecord): void {
  Array.from(mutation.addedNodes).forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    ThingChanges.handleAddedNode(node);
  });
}

function handleAttributeMutation(mutation: MutationRecord): void {
  if (!(mutation.target instanceof HTMLElement)) {
    return;
  }

  // We only care about .thing elements
  const thing = mutation.target.classList.contains("thing")
    ? mutation.target
    : mutation.target.closest(".thing");

  if (!thing) {
    return;
  }

  ThingChanges.handleSaveStateChange(thing as HTMLElement);
}

function startObserver(): void {
  const siteTable = document.getElementById("siteTable");
  if (!siteTable) {
    return;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        handleChildListMutation(mutation);
      } else if (mutation.type === "attributes") {
        handleAttributeMutation(mutation);
      }
    }
  });

  observer.observe(siteTable, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}

(function () {
  "use strict";

  function init(): void {
    if (!SiteQuery.isOldReddit()) {
      return;
    }
    console.log("Old Reddit detected, script active version 23!");
                                     
    // Process existing things once
    document
      .querySelectorAll("#siteTable .thing")
      .forEach((thing) => {
        ThingChanges.removeThingButtons(thing as HTMLElement);
        ThingChanges.handleSaveStateChange(thing as HTMLElement);
      });
    startObserver();

    // Infinite scroll setup
    initPaginationState();
    setupInfiniteScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
