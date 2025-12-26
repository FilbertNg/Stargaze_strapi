import type { Core } from '@strapi/strapi';

// --- HELPER: Define the specific fields we want to fetch ---
// We include 'formats' internally so we can resize, but we delete it later.
const imageFields = ["url", "name", "caption", "alternativeText", "width", "height", "mime", "size", "formats"];

// --- HELPER FUNCTION: Swaps the main URL with the optimized size ---
const resizeImage = (entry: any, sizePreference: 'small' | 'medium' | 'large' | 'thumbnail') => {
  if (!entry || !entry.cover_picture || !entry.cover_picture.formats) return entry;

  const formats = entry.cover_picture.formats;
  let selectedFormat = null;

  // Logic: Try the preferred size, fall back to others if missing
  if (sizePreference === 'thumbnail') {
    selectedFormat = formats.thumbnail || formats.medium || formats.small;
  } else if (sizePreference === 'small') {
    selectedFormat = formats.small || formats.medium || formats.thumbnail;
  } else if (sizePreference === 'medium') {
    selectedFormat = formats.medium || formats.small || formats.large;
  } else if (sizePreference === 'large') {
    selectedFormat = formats.large || formats.medium || formats.original;
  }

  // If we found a better format, overwrite the main properties
  if (selectedFormat) {
    entry.cover_picture.url = selectedFormat.url;
    entry.cover_picture.width = selectedFormat.width;
    entry.cover_picture.height = selectedFormat.height;
    entry.cover_picture.size = selectedFormat.size; // Update size to match the new image
    entry.cover_picture.mime = selectedFormat.mime; // Update mime to match
  }

  // **CLEANUP:** Remove 'formats' so the final API response is clean
  delete entry.cover_picture.formats;

  return entry;
};

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    strapi.log.info("In news-populate middleware.");

    const { mode, id } = ctx.query;

    if (ctx.request.url.startsWith("/api/news")) {
      if (mode === "homepage") {
        // Case 1: homepage
        ctx.query = {
          populate: {
            cover_picture: { fields: imageFields }
          },
          fields: ["title", "date"],
          sort: "date:desc",
          "pagination[page]": "1",
          "pagination[pageSize]": "3",
        };
      } else if (mode === "list") {
        // Case 2: paginated list
        const pageSize = ctx.query.limit ? String(ctx.query.limit) : "10";
        const currentPage = ctx.query.page ? String(ctx.query.page) : "1";

        ctx.query = {
          populate: {
            cover_picture: { fields: imageFields }
          },
          fields: ["title", "date"],
          sort: "date:desc",
          "pagination[page]": currentPage,
          "pagination[pageSize]": pageSize,
        };
      } else if (mode === "detail" && id) {
        // Case 3: single item
        ctx.query = {
          populate: {
            cover_picture: { fields: imageFields }
          },
          fields: ["title", "date", "news_content"],
          "filters[documentId][$eq]": String(id),
          "pagination[pageSize]": "1"
        };
      } else if (mode === "searching") {
        // Case 4: searching
        const currentPage = ctx.query.page ? String(ctx.query.page) : "1";
        const pageSize = ctx.query.limit ? String(ctx.query.limit) : "10";
        const { title, year } = ctx.query;

        const filterConditions = [];
        if (title) filterConditions.push({ $or: [{ title: { $containsi: title as string } }] });
        if (year) filterConditions.push({ date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } });

        ctx.query = {
          populate: {
            cover_picture: { fields: imageFields }
          },
          fields: ["title", "date"],
          filters: { $and: filterConditions },
          sort: "date:desc",
          "pagination[pageSize]": pageSize,
          "pagination[page]": currentPage
        };
      } else {
        ctx.status = 400;
        ctx.body = { error: "Invalid query. Use ?mode=homepage, ?mode=list, ?mode=searching, or ?mode=detail&id=..." };
        return;
      }
    }

    await next();

    // **MODIFIED RESPONSE FORMATTING**
    if (ctx.body && ctx.body.data) {

      // 1. Process Images FIRST based on mode
      if (Array.isArray(ctx.body.data)) {
        ctx.body.data = ctx.body.data.map((item) => {
          if (mode === 'homepage' || mode === 'list' || mode === 'searching') {
            return resizeImage(item, 'small');
          } else if (mode === 'detail') {
            return resizeImage(item, 'large');
          }
          return item;
        });
      }

      // 2. Format JSON Structure
      if (mode === 'homepage') {
        strapi.log.info('Middleware: Formatting for homepage (data array).');
        ctx.body = ctx.body.data;
      } else if (mode === 'detail' && id) {
        strapi.log.info('Middleware: Formatting for detail (single item).');
        ctx.body = ctx.body.data.length > 0 ? ctx.body.data[0] : null;
      } else if (mode === 'list' || mode === 'searching') {
        strapi.log.info('Middleware: Formatting for list/search (full payload).');
      }
    }
  };
};