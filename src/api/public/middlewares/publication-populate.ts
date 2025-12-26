import type { Core } from '@strapi/strapi';

// --- HELPER: Define the specific fields we want to fetch ---
// We include 'formats' internally so we can resize, but we delete it later.
const imageFields = ["url", "name", "caption", "alternativeText", "width", "height", "mime", "size", "formats"];

// --- HELPER: Swaps the main URL with the optimized size ---
const resizeImage = (entry: any, fieldName: string, sizePreference: 'small' | 'medium' | 'large' | 'thumbnail') => {
  // Check if the specific field exists on the entry
  if (!entry || !entry[fieldName] || !entry[fieldName].formats) return;

  const formats = entry[fieldName].formats;
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
    entry[fieldName].url = selectedFormat.url;
    entry[fieldName].width = selectedFormat.width;
    entry[fieldName].height = selectedFormat.height;
    entry[fieldName].size = selectedFormat.size;
    entry[fieldName].mime = selectedFormat.mime;

    // Remove the heavy formats object to clean up JSON
    delete entry[fieldName].formats;
  }
};

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    strapi.log.info("In publication-populate middleware.");

    // **MODIFICATION: Capture mode before ctx.query is modified**
    const { mode, id } = ctx.query;

    if (ctx.request.url.startsWith("/api/publics")) {
      if (mode === "homepage") {
        // Case 1: homepage → top 5 
        ctx.query = {
          populate: {
            cover_picture: {
              fields: imageFields,
            },
          },
          fields: ["title", "journal_name", "impact_factor", "indexing_classification", "doi_link"],
          sort: "impact_factor:desc",
          "pagination[page]": "1",
          "pagination[pageSize]": "8",
        };
      } else if (mode === "list") {
        // Case 2: paginated list, sorted by impact_factor
        const pageSize = ctx.query.limit ? String(ctx.query.limit) : "10";
        const currentPage = ctx.query.page ? String(ctx.query.page) : "1";

        ctx.query = {
          populate: {
            cover_picture: {
              fields: imageFields,
            },
          },
          fields: ["title", "journal_name", "vol", "issue", "page_start", "page_end", "impact_factor", "indexing_classification", "publication_type", "doi_link", "publishedAt"],
          sort: "impact_factor:desc",
          "pagination[page]": currentPage,
          "pagination[pageSize]": pageSize,
        };
      } else if (mode === "detail" && id) {
        // Case 3: single item by ID
        ctx.query = {
          populate: {
            author: true,
            cover_picture: {
              fields: imageFields,
            },
            grants_and_projects: {
              fields: ["id", "project_title", "grant_scheme_name", "grant_code", "pi_name", "start_date", "end_date", "total_funding"],
            },
          },
          "filters[documentId][$eq]": String(id),
          "pagination[pageSize]": "1"
        };
      } else if (mode === "searching") {
        // Case 4: searching a specific publication
        const currentPage = ctx.query.page ? String(ctx.query.page) : "1";
        const pageSize = ctx.query.limit ? String(ctx.query.limit) : "10";

        const { title, classification, type, year } = ctx.query;

        const filterConditions = [];

        if (title) {
          filterConditions.push({
            $or: [
              { title: { $containsi: title as string } },
              { journal_name: { $containsi: title as string } }
            ]
          });
        }

        if (classification) {
          filterConditions.push({
            indexing_classification: { $eq: classification }
          });
        }

        if (type) {
          filterConditions.push({
            publication_type: { $eq: type }
          });
        }

        if (year) {
          filterConditions.push({
            publishedAt: {
              $gte: `${year}-01-01`,
              $lte: `${year}-12-31`
            }
          });
        }

        ctx.query = {
          populate: {
            cover_picture: {
              fields: imageFields,
            },
          },
          fields: [
            "title", "journal_name", "vol", "issue", "page_start", "page_end",
            "impact_factor", "indexing_classification", "publication_type",
            "doi_link", "publishedAt"
          ],
          filters: {
            $and: filterConditions
          },
          sort: "impact_factor:desc",
          "pagination[pageSize]": pageSize,
          "pagination[page]": currentPage
        };
      } else {
        // 🚫 Block everything else
        ctx.status = 400;
        ctx.body = {
          error: "Invalid query. Use ?mode=homepage, ?mode=list, ?mode=searching, or ?mode=detail&id=...",
        };
        return; // stop here, don't call next()
      }
    }

    await next();

    // ** IMAGE RESIZING LOGIC **
    if (ctx.body && ctx.body.data !== undefined) {

      const targetSize = (mode === 'detail') ? 'medium' : 'small';
      const dataItems = Array.isArray(ctx.body.data) ? ctx.body.data : [ctx.body.data];

      dataItems.forEach((item) => {
        // 1. Resize Cover Picture
        resizeImage(item, 'cover_picture', targetSize);

        // 2. Resize Author Avatar (if exists in your schema)
        // If authors have images, we usually want them small/thumbnail
        if (item.author) {
          const authors = Array.isArray(item.author) ? item.author : [item.author];
          authors.forEach(auth => {
            resizeImage(auth, 'avatar', 'small'); // Assuming field is named 'avatar' or similar
            resizeImage(auth, 'profile_picture', 'small'); // Just in case it's named differently
          });
        }
      });

      // ** RESPONSE FORMATTING **
      if (mode === 'homepage') {
        strapi.log.info('Middleware: Formatting for homepage (data array).');
        ctx.body = ctx.body.data;
      } else if (mode === 'detail' && id) {
        strapi.log.info('Middleware: Formatting for detail (single item).');
        ctx.body = ctx.body.data.length > 0 ? ctx.body.data[0] : null;
      } else if (mode === 'list' || mode === 'searching') {
        strapi.log.info('Middleware: Formatting for list/search (full payload).');
      } else {
        strapi.log.warn(`Middleware: Unhandled mode '${mode}', passing full payload.`);
      }
    }
  };
};