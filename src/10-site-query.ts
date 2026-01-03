namespace SiteQuery {
  export function isOldReddit(): boolean {
    return document.getElementById("siteTable") !== null;
  }
}
