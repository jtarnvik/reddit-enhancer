// ==UserScript==
// @name         Reddit Enhancer (DEV)
// @namespace    https://example.com/reddit-enhancer
// @version      0.1.0
// @description  Experimental Reddit enhancements for old Reddit
// @match        https://old.reddit.com/*
// @match        https://www.reddit.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==
var Dom;
(function (Dom) {
    function isOldReddit() {
        return document.getElementById("siteTable") !== null;
    }
    Dom.isOldReddit = isOldReddit;
})(Dom || (Dom = {}));
function removeThingButtons(thing) {
    if (thing.dataset.reProcessed === "true") {
        return;
    }
    thing
        .querySelectorAll("li.crosspost-button, li.report-button, li.share")
        .forEach((li) => li.remove());
    thing.dataset.reProcessed = "true";
}
function isSavedThing(thing) {
    return thing.classList.contains("saved");
}
function handleSaveStateChange(thing) {
    const hideLink = thing.querySelector("form.hide-button a");
    if (!hideLink) {
        return;
    }
    hideLink.hidden = isSavedThing(thing);
}
function handleAddedNode(node) {
    if (node.classList.contains("thing")) {
        removeThingButtons(node);
    }
    if (node.classList.contains("hidden-post-placeholder")) {
        node.remove();
        return;
    }
    node
        .querySelectorAll(".thing")
        .forEach(el => removeThingButtons(el));
    node
        .querySelectorAll(".hidden-post-placeholder")
        .forEach(el => el.remove());
}
function handleChildListMutation(mutation) {
    Array.from(mutation.addedNodes).forEach((node) => {
        if (!(node instanceof HTMLElement)) {
            return;
        }
        handleAddedNode(node);
    });
}
function handleAttributeMutation(mutation) {
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
    handleSaveStateChange(thing);
}
function startObserver() {
    const siteTable = document.getElementById("siteTable");
    if (!siteTable) {
        return;
    }
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                handleChildListMutation(mutation);
            }
            else if (mutation.type === "attributes") {
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
    function init() {
        if (!Dom.isOldReddit()) {
            return;
        }
        console.log("Old Reddit detected, script active version 18!");
        // Process existing things once
        document
            .querySelectorAll("#siteTable .thing")
            .forEach((thing) => {
            removeThingButtons(thing);
            handleSaveStateChange(thing);
        });
        startObserver();
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    }
    else {
        init();
    }
})();
