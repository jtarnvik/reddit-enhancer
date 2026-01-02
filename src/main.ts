function removeThingButtons(thing: HTMLElement): void {
  if (thing.dataset.reProcessed === "true") {
    return;
  }
  thing
    .querySelectorAll("li.crosspost-button, li.report-button, li.share")
    .forEach((li) => li.remove());
  thing.dataset.reProcessed = "true";
}

function isSavedThing(thing: HTMLElement): boolean {
  return thing.classList.contains("saved");
}

function handleSaveStateChange(thing: HTMLElement): void {
  const hideLink = thing.querySelector<HTMLAnchorElement>("form.hide-button a");
  if (!hideLink) {
    return;
  }

  hideLink.hidden = isSavedThing(thing);
}

function handleAddedNode(node: HTMLElement): void {
  if (node.classList.contains("thing")) {
    removeThingButtons(node);
  }

  if (node.classList.contains("hidden-post-placeholder")) {
    node.remove();
    return;
  }

  node
    .querySelectorAll(".thing")
    .forEach(el => removeThingButtons(el as HTMLElement));

  node
    .querySelectorAll(".hidden-post-placeholder")
    .forEach(el => el.remove());
}

function handleChildListMutation(mutation: MutationRecord): void {
  Array.from(mutation.addedNodes).forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    handleAddedNode(node);
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

  handleSaveStateChange(thing as HTMLElement);
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
    if (!Dom.isOldReddit()) {
      return;
    }
    console.log("Old Reddit detected, script active version 18!");
                                     
    // Process existing things once
    document
      .querySelectorAll("#siteTable .thing")
      .forEach((thing) => {
        removeThingButtons(thing as HTMLElement);
        handleSaveStateChange(thing as HTMLElement);
      });
    startObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
