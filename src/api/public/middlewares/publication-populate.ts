// ./src/middlewares/publication-populate.ts (or wherever you have it)
import type { Core } from '@strapi/strapi';

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
            author: true,
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
          },
          fields: ["title", "journal_name", "impact_factor", "indexing_classification",  "doi_link"],
          sort: "impact_factor:desc",
          "pagination[page]": "1",
          "pagination[pageSize]": "5",
        };
      } else if (mode === "list") {
        // Case 2: paginated list, sorted by impact_factor
        const pageSize = ctx.query.limit ? String(ctx.query.limit) : "10";
        const currentPage = ctx.query.page ? String(ctx.query.page) : "1";

        ctx.query = {
          populate: {
            author: true,
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
          },
          fields: ["title", "journal_name", "vol", "issue", "page_start", "page_end", "impact_factor", "indexing_classification", "publication_type", "doi_link","publishedAt"],
          sort: "impact_factor:desc",
          "pagination[page]": currentPage,
          "pagination[pageSize]": pageSize,
        };
      } else if (mode === "detail" && id) {
        // Case 3: single item by ID
        // Note: This will still return { data: [item], meta: {...} }
        // We will flatten this to just `item` at the end.
        ctx.query = {
          populate: {
            author: true,
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
          },
          "filters[id][$eq]": String(id),
          "pagination[pageSize]": "1"
        };
      } else if (mode === "searching") {
        // Case 4: searching a specific publication
        const  filters: Record<string, any> = {};
        const currentPage = ctx.query.page ? String(ctx.query.page) : "1";
        const pageSize = ctx.query.limit ? String(ctx.query.limit) : "10";

        const { title, classification, type, year } = ctx.query;

        if (title) {
          filters.$or = [
            { title: { $containsi: title as string } },
            { journal_name: { $containsi: title as string } }
          ];
        }

        if (classification) {
          filters.indexing_classification = { $eq: classification };
        }

        if (type) {
          filters.publication_type = { $eq: type };
        }

        if (year) {
          filters.publishedAt = {
            $gte: `${year}-01-01`,
            $lte: `${year}-12-31`
          };
        }

        ctx.query = {
          populate: {
            author: true,
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
          },
          fields: [
            "title", "journal_name", "vol", "issue", "page_start", "page_end",
            "impact_factor", "indexing_classification", "publication_type",
            "doi_link", "publishedAt"
          ],
          filters,
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

    // **MODIFIED RESPONSE FORMATTING**
    // This now checks the 'mode' we saved earlier to decide how to format the response.
    if (ctx.body && ctx.body.data !== undefined) {
      if (mode === 'homepage') {
        // Homepage: Just send the array of data
        strapi.log.info('Middleware: Formatting for homepage (data array).');
        ctx.body = ctx.body.data;
      } else if (mode === 'detail' && id) {
        // Detail: Send the *first item* from the data array, or null
        strapi.log.info('Middleware: Formatting for detail (single item).');
        ctx.body = ctx.body.data.length > 0 ? ctx.body.data[0] : null;
      } else if (mode === 'list' || mode === 'searching') {
        // List or Searching: Send the *full payload* { data: [...], meta: {...} }
        strapi.log.info('Middleware: Formatting for list/search (full payload).');
        // DO NOTHING - pass the full body with data and meta
      } else {
        // Fallback for unhandled modes
        strapi.log.warn(`Middleware: Unhandled mode '${mode}', passing full payload.`);
      }
    }
  };
};