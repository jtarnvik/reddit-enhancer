// ==UserScript==
// @name         Reddit Enhancer
// @namespace    https://tarnvik.com/reddit-enhancer
// @version      1.43.0
// @description  Enhancements for old Reddit, a few features with inspiration from https://redditenhancementsuite.com/
// @match        https://old.reddit.com/*
// @match        https://www.reddit.com/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// ==/UserScript==
var SiteQuery;
(function (SiteQuery) {
    function isOldReddit() {
        return document.getElementById("siteTable") !== null;
    }
    SiteQuery.isOldReddit = isOldReddit;
})(SiteQuery || (SiteQuery = {}));
var HelperFunctions;
(function (HelperFunctions) {
    function sanitizeFilename(name) {
        return name
            .replace(/[<>:"/\\|?*]+/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }
    HelperFunctions.sanitizeFilename = sanitizeFilename;
    function getFileExtensionFromUrl(url) {
        try {
            const pathname = new URL(url).pathname;
            const dot = pathname.lastIndexOf(".");
            return dot !== -1 ? pathname.slice(dot) : "";
        }
        catch {
            return "";
        }
    }
    HelperFunctions.getFileExtensionFromUrl = getFileExtensionFromUrl;
    function buildFilename(title, url) {
        const sanitizedTitle = HelperFunctions.sanitizeFilename(title);
        const ext = getFileExtensionFromUrl(url);
        if (!ext) {
            return sanitizedTitle;
        }
        if (sanitizedTitle.endsWith(".")) {
            return sanitizedTitle.slice(0, -1) + ext;
        }
        return sanitizedTitle + ext;
    }
    HelperFunctions.buildFilename = buildFilename;
})(HelperFunctions || (HelperFunctions = {}));
var ThingChanges;
(function (ThingChanges) {
    function removeThingButtons(thing) {
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
            handler.init();
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
        const entry = thing.querySelector(".entry");
        entry?.appendChild(box);
        return box;
    }
    function triggerImageDownload(url, title) {
        GM_xmlhttpRequest({
            method: "GET",
            url,
            responseType: "blob",
            onload: (res) => {
                const blob = res.response;
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = objectUrl;
                a.download = HelperFunctions.buildFilename(title, url);
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(objectUrl);
                a.remove();
            },
            onerror: (err) => {
                console.error("Download failed", err);
            }
        });
    }
    function createImageWithDownload(thing, imgUrl) {
        const wrapper = document.createElement("div");
        wrapper.className = "re-image-wrapper";
        const img = document.createElement("img");
        img.src = imgUrl;
        img.style.maxWidth = "800px";
        img.style.maxHeight = "800px";
        img.style.height = "auto";
        const title = thing.querySelector("a.title")?.textContent ??
            "reddit-image";
        const download = document.createElement("a");
        download.className = "re-download-button";
        download.textContent = "⬇";
        download.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerImageDownload(imgUrl, title);
        });
        wrapper.appendChild(download);
        wrapper.appendChild(img);
        return wrapper;
    }
    async function toggleRedditImagePreview(thing, button, localPreview) {
        await localPreview.ready;
        const post = localPreview.get(thing.getAttribute("data-fullname"));
        const description = post?.preview?.images?.[0]?.caption ??
            post?.media_metadata?.[Object.keys(post.media_metadata ?? {})[0]]?.caption ??
            post?.selftext ??
            post?.title;
        console.log("description", description);
        // continue by presenting this!
        const box = getExpandoBox(thing);
        if (box.childElementCount > 0) {
            box.innerHTML = "";
            box.style.marginTop = "0px";
            button.textContent = "▶ Preview";
            return;
        }
        const link = thing.querySelector("a.title");
        if (!link)
            return;
        const imgWithDownload = createImageWithDownload(thing, link.href);
        box.appendChild(imgWithDownload);
        box.style.marginTop = "8px";
        button.textContent = "▼ Hide";
    }
    function addPreviewButton(thing, localPreview) {
        if (thing.querySelector(".re-expando-button"))
            return;
        const button = document.createElement("button");
        button.className = "re-expando-button";
        button.textContent = "▶ Preview";
        button.addEventListener("click", () => toggleRedditImagePreview(thing, button, localPreview));
        const buttons = thing.querySelector(".entry .buttons");
        buttons?.prepend(button);
    }
    function injectPreviewStyles() {
        if (document.getElementById("re-preview-styles")) {
            return;
        }
        const style = document.createElement("style");
        style.id = "re-preview-styles";
        style.textContent = `
    .re-image-wrapper {
      position: relative;
      display: inline-block;
    }

    .re-download-button {
      position: absolute;
      top: 6px;
      left: 6px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 6px;
      font-size: 12px;
      border-radius: 3px;
      cursor: pointer;
      text-decoration: none;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .re-image-wrapper:hover .re-download-button {
      opacity: 1;
    }
  `;
        document.head.appendChild(style);
    }
    class Preview {
        init() {
            injectPreviewStyles();
        }
        adjustWithREPreview(thing, previewInfo) {
            suppressRedditExpando(thing);
            getExpandoBox(thing);
            if (!previewInfo) {
                addPreviewButton(thing, { byFullname: new Map(), ready: Promise.resolve(), get: () => undefined });
                return;
            }
            console.log("previewInfo", previewInfo);
            addPreviewButton(thing, previewInfo);
        }
        canHandle(node) {
            return (node.dataset.domain === "i.redd.it" &&
                node.dataset.isGallery === "false");
        }
        name() {
            return "PreviewIReddItNonGallery";
        }
        createPreviewInfo(things) {
            const ids = [];
            for (const thing of things) {
                const fullname = thing.getAttribute("data-fullname");
                if (fullname) {
                    ids.push(fullname);
                }
            }
            if (ids.length === 0) {
                return null;
            }
            const combined = ids.join(",");
            const url = `https://www.reddit.com/by_id/${combined}.json?raw_json=1`;
            const byFullname = new Map();
            const ready = (async () => {
                const response = await fetch(url, { credentials: "omit" });
                if (!response.ok) {
                    throw new Error("Failed to fetch preview metadata");
                }
                const json = (await response.json());
                console.log("Got preview metadata, setting up result!");
                for (const child of json.data.children) {
                    if (child.kind !== "t3")
                        continue;
                    byFullname.set(child.data.name, child.data);
                }
            })();
            return {
                byFullname,
                ready,
                get(fullname) {
                    return byFullname.get(fullname);
                }
            };
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
        console.log("Old Reddit detected, script active. Version 1.43.0!");
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
