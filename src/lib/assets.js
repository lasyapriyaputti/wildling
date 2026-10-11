/** Absolute URL of a file in /public, valid on the page and inside the worker. */
export const assetUrl = (path) => new URL(path, new URL(import.meta.env.BASE_URL, self.location.href)).href;
