// ==UserScript==
// @name         Reddit Enhancer
// @namespace    https://tarnvik.com/reddit-enhancer
// @version      1.39.0
// @description  Enhancements for old Reddit, a few features with inspiration from https://redditenhancementsuite.com/
// @match        https://old.reddit.com/*
// @match        https://www.reddit.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==
var SiteQuery;
(function (SiteQuery) {
    function isOldReddit() {
        return document.getElementById("siteTable") !== null;
    }
    SiteQuery.isOldReddit = isOldReddit;
})(SiteQuery || (SiteQuery = {}));
var ThingChanges;
(function (ThingChanges) {
    function removeThingButtons(thing) {
        if (thing.dataset.reProcessed === "true") {
            return;
        }
        thing
            .querySelectorAll("li.crosspost-button, li.report-button, li.share")
            .forEach((li) => li.remove());
        thing.dataset.reProcessed = "true";
    }
    ThingChanges.removeThingButtons = removeThingButtons;
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
    ThingChanges.handleSaveStateChange = handleSaveStateChange;
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
    ThingChanges.handleAddedNode = handleAddedNode;
})(ThingChanges || (ThingChanges = {}));
var InfiniteScroll;
(function (InfiniteScroll) {
    let nextAfter = null;
    let nextCount = 0;
    let isLoadingNextPage = false;
    let currentPage = 1;
    let scrollUiContainer;
    let loadingEl = null;
    let infiniteObserver = null;
    function ensureScrollUiContainer() {
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
    function showLoading() {
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
    function hideLoading() {
        loadingEl?.remove();
        loadingEl = null;
    }
    function injectStyles() {
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
    InfiniteScroll.injectStyles = injectStyles;
    function addPageMarker(page) {
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
    function initPaginationState() {
        const things = document.querySelectorAll("#siteTable .thing");
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
    InfiniteScroll.initPaginationState = initPaginationState;
    function appendNextPage(html) {
        const container = document.createElement("div");
        container.innerHTML = html;
        const newThings = container.querySelectorAll("#siteTable .thing");
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
    async function loadNextPage() {
        if (isLoadingNextPage || !nextAfter) {
            return;
        }
        isLoadingNextPage = true;
        showLoading();
        const url = new URL(window.location.href);
        url.searchParams.set("after", nextAfter);
        url.searchParams.set("count", String(nextCount));
        try {
            const response = await fetch(url.toString(), { credentials: "same-origin", });
            if (!response.ok) {
                console.warn("Failed to load next page");
                return;
            }
            const html = await response.text();
            addPageMarker(++currentPage);
            appendNextPage(html);
        }
        finally {
            hideLoading();
            isLoadingNextPage = false;
        }
    }
    function shouldEnableInfiniteScroll() {
        // Hard stop: comment pages
        if (location.pathname.includes("/comments/")) {
            return false;
        }
        // Defensive fallback
        const things = document.querySelectorAll("#siteTable .thing");
        return things.length > 1;
    }
    function setupInfiniteScroll() {
        if (!shouldEnableInfiniteScroll()) {
            console.log("Infinite scroll disabled on this page");
            return;
        }
        const siteTable = document.getElementById("siteTable");
        if (!siteTable) {
            return;
        }
        const navButtons = document.querySelector("#siteTable .nav-buttons");
        if (navButtons) {
            navButtons.remove();
        }
        const sentinel = document.createElement("div");
        sentinel.id = "re-infinite-sentinel";
        sentinel.style.height = "1px";
        siteTable.appendChild(sentinel);
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                loadNextPage();
            }
        }, {
            rootMargin: "800px", // start loading before user hits bottom
        });
        infiniteObserver = observer;
        observer.observe(sentinel);
    }
    InfiniteScroll.setupInfiniteScroll = setupInfiniteScroll;
})(InfiniteScroll || (InfiniteScroll = {}));
var PreviewFactory;
(function (PreviewFactory) {
    function logElementsThings(str, things) {
        const ids = things.map(thing => thing.getAttribute("data-fullname"));
        console.log(`${str}: Found ${ids.length} elements: ${ids.join(", ")}`);
    }
    class ByHandler {
        constructor(mediaHandler) {
            this.nodes = [];
            this.mediaHandler = mediaHandler;
        }
        get handler() {
            return this.mediaHandler;
        }
        addNode(node) {
            this.nodes.push(node);
        }
        adjustPreview() {
            logElementsThings("Adjusting preview", this.nodes);
            const previewInfo = this.mediaHandler.createPreviewInfo(this.nodes);
            this.nodes.forEach(node => this.mediaHandler.adjustWithREPreview(node, previewInfo));
        }
    }
    PreviewFactory.ByHandler = ByHandler;
    class SortedByHandler {
        constructor() {
            this.byHandler = [];
        }
        addNode(node, handler) {
            for (const itm of this.byHandler) {
                if (handler === itm.handler) {
                    itm.addNode(node);
                    return;
                }
            }
            const itm = new ByHandler(handler);
            itm.addNode(node);
            this.byHandler.push(itm);
        }
        adjustPreview() {
            this.byHandler.forEach(itm => itm.adjustPreview());
        }
    }
    PreviewFactory.SortedByHandler = SortedByHandler;
    class Factory {
        constructor() {
            this.handlers = [];
        }
        name() {
            return "PreviewFactory";
        }
        registerMediaHandler(handler) {
            console.log(`Registered media handler: ${handler.name()}`);
            this.handlers.push(handler);
        }
        adjustPreview(things) {
            const sortedByHandler = new SortedByHandler();
            things.forEach(thing => {
                if (!thing.classList.contains("thing")) {
                    return;
                }
                for (const handler of this.handlers) {
                    if (handler.canHandle(thing)) {
                        sortedByHandler.addNode(thing, handler);
                        break;
                    }
                }
            });
            sortedByHandler.adjustPreview();
        }
    }
    PreviewFactory.Factory = Factory;
    PreviewFactory.factory = new Factory();
})(PreviewFactory || (PreviewFactory = {}));
var PreviewIReddItNonGallery;
(function (PreviewIReddItNonGallery) {
    function suppressRedditExpando(thing) {
        thing
            .querySelectorAll(".expando-button")
            .forEach(el => el.remove());
    }
    function getExpandoBox(thing) {
        let box = thing.querySelector(".re-expando-box");
        if (box)
            return box;
        box = document.createElement("div");
        box.className = "re-expando-box";
        box.style.marginTop = "8px";
        const entry = thing.querySelector(".entry");
        entry?.appendChild(box);
        return box;
    }
    function toggleRedditImagePreview(thing, button) {
        const box = getExpandoBox(thing);
        if (box.childElementCount > 0) {
            box.innerHTML = "";
            button.textContent = "▶ Preview";
            return;
        }
        const link = thing.querySelector("a.title");
        if (!link)
            return;
        const img = document.createElement("img");
        img.src = link.href;
        // img.style.maxWidth = "100%";
        img.style.maxWidth = "800px";
        img.style.maxHeight = "800px";
        img.style.height = "auto";
        box.appendChild(img);
        button.textContent = "▼ Hide";
    }
    function addPreviewButton(thing) {
        if (thing.querySelector(".re-expando-button"))
            return;
        const button = document.createElement("button");
        button.className = "re-expando-button";
        button.textContent = "▶ Preview";
        button.addEventListener("click", () => toggleRedditImagePreview(thing, button));
        const buttons = thing.querySelector(".entry .buttons");
        buttons?.prepend(button);
    }
    class Preview {
        adjustWithREPreview(thing, previewInfo) {
            console.log("Adjusting i.redd.it non-gallery post");
            suppressRedditExpando(thing);
            getExpandoBox(thing);
            addPreviewButton(thing);
        }
        canHandle(node) {
            return (node.dataset.domain === "i.redd.it" &&
                node.dataset.isGallery === "false");
        }
        name() {
            return "PreviewIReddItNonGallery";
        }
        createPreviewInfo(things) {
            console.log("Method not implemented.");
            return null;
        }
    }
    PreviewIReddItNonGallery.Preview = Preview;
    PreviewFactory.factory.registerMediaHandler(new Preview());
})(PreviewIReddItNonGallery || (PreviewIReddItNonGallery = {}));
function handleChildListMutation(mutations) {
    if (!mutations || mutations.length === 0) {
        return;
    }
    const adjustPreview = [];
    mutations.forEach(mutation => {
        Array.from(mutation.addedNodes).forEach((node) => {
            if (!(node instanceof HTMLElement)) {
                return;
            }
            ThingChanges.handleAddedNode(node);
            adjustPreview.push(node);
        });
    });
    if (adjustPreview.length !== 0) {
        PreviewFactory.factory.adjustPreview(adjustPreview);
    }
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
    ThingChanges.handleSaveStateChange(thing);
}
function startObserver() {
    const siteTable = document.getElementById("siteTable");
    if (!siteTable) {
        return;
    }
    const observer = new MutationObserver((mutations) => {
        console.log("--Mutation observed");
        const childMutations = [];
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                childMutations.push(mutation);
            }
            else if (mutation.type === "attributes") {
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
function disableUserHoverPreviews() {
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
    function init() {
        if (!SiteQuery.isOldReddit()) {
            return;
        }
        console.log("Old Reddit detected, script active. Version 1.39.0!");
        // Process existing things once
        const things = document
            .querySelectorAll("#siteTable .thing");
        const adjustPreview = [];
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
    }
    else {
        init();
    }
})();
