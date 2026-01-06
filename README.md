# reddit-enhancer - A simple Safari RES variant.

This script adds a few features to old.reddit.com. These features are created with inspiration from RES,
having read none of the code, but after many years of heavy use.

The script can be installed with [Tampermonkey](https://www.tampermonkey.net/), and probably other user script engines which I've never heard of.

This script has a these features:
- Adds inifinate scroll.
- When a item is hidden, it removes the placeholder.
- Removes the cross-post, share and report buttons.
- Removes tooltip for authors. I dont find them usefule, and sometimes they stick sround for to long.

## Mostly for Safari
On Chrome [RES](https://redditenhancementsuite.com/) has several orders of magnitude more features, so you should probably use that.

// ==UserScript==
// @name         Reddit Enhancer v1
// @namespace    https://example.com/reddit-enhancer
// @version      0.41.0
// @description  Experimental Reddit enhancements for old Reddit
// @match        https://old.reddit.com/*
// @match        https://www.reddit.com/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @require      http://localhost:8080/reddit-enhancer.user.js
// ==/UserScript==
