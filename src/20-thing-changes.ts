namespace ThingChanges {
  export function removeThingButtons(thing: HTMLElement): void {
    if (thing.classList.contains("promoted") || thing.dataset.promoted === "true") {
      thing.remove();
      return;
    }

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

  export function handleSaveStateChange(thing: HTMLElement): void {
    const hideLink = thing.querySelector<HTMLAnchorElement>("form.hide-button a");
    if (!hideLink) {
      return;
    }

    hideLink.hidden = isSavedThing(thing);
  }

  export function handleAddedNode(node: HTMLElement): void {
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
}
