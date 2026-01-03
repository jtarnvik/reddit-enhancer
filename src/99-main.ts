
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
    console.log("Old Reddit detected, script active. Version 34!");

    // Process existing things once
    document
      .querySelectorAll("#siteTable .thing")
      .forEach((thing) => {
        ThingChanges.removeThingButtons(thing as HTMLElement);
        ThingChanges.handleSaveStateChange(thing as HTMLElement);
      });
    startObserver();

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
