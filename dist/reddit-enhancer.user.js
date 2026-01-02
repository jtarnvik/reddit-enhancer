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
function removeUnwantedButtons(root) {
    root
        .querySelectorAll("li.crosspost-button, li.report-button, li.share")
        .forEach((li) => li.remove());
    kolla;
    om;
    det;
    finns;
    en;
    "sluta spara";
    knapp, i;
    så;
    fall;
    disable;
    göm, annars;
    enable;
}
function processThing(thing) {
    if (thing.dataset.reProcessed === "true") {
        return;
    }
    removeUnwantedButtons(thing);
    thing.dataset.reProcessed = "true";
}
function handleAddedNode(node) {
    if (node.classList.contains("thing")) {
        processThing(node);
    }
    if (node.classList.contains("hidden-post-placeholder")) {
        node.remove();
        return;
    }
    node
        .querySelectorAll(".thing")
        .forEach(el => processThing(el));
    node
        .querySelectorAll(".hidden-post-placeholder")
        .forEach(el => el.remove());
}
function startObserver() {
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
                handleAddedNode(node);
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
    function init() {
        if (!Dom.isOldReddit()) {
            return;
        }
        console.log("Old Reddit detected, script active version 13!");
        // Process existing things once
        document
            .querySelectorAll("#siteTable .thing")
            .forEach((thing) => processThing(thing));
        startObserver();
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    }
    else {
        init();
    }
})();
