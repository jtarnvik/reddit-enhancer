function removeUnwantedButtons(root: ParentNode): void {
  root
    .querySelectorAll("li.crosspost-button, li.report-button, li.share")
    .forEach((li) => li.remove());
}

function processThing(thing: HTMLElement): void {
  if (thing.dataset.reProcessed === "true") {
    return;
  }
  removeUnwantedButtons(thing);
  thing.dataset.reProcessed = "true";
}

function handleAddedNode(node: HTMLElement): void {
  if (node.classList.contains("thing")) {
    processThing(node);
  }

  if (node.classList.contains("hidden-post-placeholder")) {
    node.remove();
    return;
  }

  node
    .querySelectorAll(".thing")
    .forEach(el => processThing(el as HTMLElement));

  node
    .querySelectorAll(".hidden-post-placeholder")
    .forEach(el => el.remove());
}


function startObserver(): void {
  const siteTable = document.getElementById("siteTable");
  if (!siteTable) {
    return;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }

      Array.from(mutation.addedNodes).forEach((node) => {
        if (!(node instanceof HTMLElement)) {
          return;
        }
        handleAddedNode(node as HTMLElement);
      });
    }
  });

  observer.observe(siteTable, {
    childList: true,
    subtree: true,
  });
}

(function () {
  "use strict";

  function init(): void {
    if (!Dom.isOldReddit()) {
      return;
    }
    console.log("Old Reddit detected, script active version 13!");

    // Process existing things once
    document
      .querySelectorAll("#siteTable .thing")
      .forEach((thing) => processThing(thing as HTMLElement));
    startObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
