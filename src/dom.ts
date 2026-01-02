namespace Dom {
  export function isOldReddit(): boolean {
    return document.getElementById("siteTable") !== null;
  }
}
