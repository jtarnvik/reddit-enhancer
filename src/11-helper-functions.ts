namespace HelperFunctions {
  export function sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  export function getFileExtensionFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const dot = pathname.lastIndexOf(".");
      return dot !== -1 ? pathname.slice(dot) : "";
    } catch {
      return "";
    }
  }

  export function buildFilename(title: string, url: string): string {
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
}