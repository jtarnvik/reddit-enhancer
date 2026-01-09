function handleChildListMutation(mutations: MutationRecord[]): void {
  if (!mutations || mutations.length === 0) {
    return;
  }

  const adjustPreview: HTMLElement[] = [];
  mutations.forEach(mutation => {
    Array.from(mutation.addedNodes).forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }
      ThingChanges.handleAddedNode(node);
      adjustPreview.push(node);
    })
  });
  if (adjustPreview.length !== 0) {
    PreviewFactory.factory.adjustPreview(adjustPreview);
  }
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
    const childMutations: MutationRecord[] = [];
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        childMutations.push(mutation);
      } else if (mutation.type === "attributes") {
        handleAttributeMutation(mutation);
      }
    }
    handleChildListMutation(childMutations);
  });

  observer.observe(siteTable, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}

function disableUserHoverPreviews(): void {
  const style = document.createElement("style");
  style.textContent = `
    .hovercard, 
    .user-hover,
    .author-tooltip {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

(function () {
  "use strict";

  function init(): void {
    if (!SiteQuery.isOldReddit()) {
      return;
    }
    console.log("Old Reddit detected, script active. Version 1.48.0!");

    // Process existing things once
    const things = document
      .querySelectorAll("#siteTable .thing");

    const adjustPreview: HTMLElement[] = [];
    things.forEach((thing) => {
      if (!(thing instanceof HTMLElement)) {
        return;
      }
      ThingChanges.removeThingButtons(thing);
      ThingChanges.handleSaveStateChange(thing);
      adjustPreview.push(thing);
    });
    PreviewFactory.factory.adjustPreview(adjustPreview);
    startObserver();

    disableUserHoverPreviews();

    // Infinite scroll setup
    InfiniteScroll.injectStyles();
    InfiniteScroll.initPaginationState();
    InfiniteScroll.setupInfiniteScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
