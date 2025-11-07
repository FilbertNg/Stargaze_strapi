import type { Core } from '@strapi/strapi';

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    strapi.log.info("In news-populate middleware.");

    // **MODIFICATION: Capture mode before ctx.query is modified**
    const { mode, id } = ctx.query;

    if (ctx.request.url.startsWith("/api/news")) {
      if (mode === "homepage") {
        // Case 1: homepage, based on date
        ctx.query = {
          populate: {
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
          },
          fields: ["title", "date"],
          sort: "date:desc",
          "pagination[page]": "1",
          "pagination[pageSize]": "3",
        };
      } else if (mode === "list") {
        // Case 2: paginated list, sorted by date
        const pageSize = ctx.query.limit ? String(ctx.query.limit) : "10";
        const currentPage = ctx.query.page ? String(ctx.query.page) : "1";

        ctx.query = {
          populate: {
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
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
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
          },
          fields: ["title", "date", "news_content"],
          "filters[id][$eq]": String(id),
          "pagination[pageSize]": "1"
        };
      } else if (mode === "searching") {
        // Case 4: searching
        const filters: Record<string, any> = {};
        const currentPage = ctx.query.page ? String(ctx.query.page) : "1";
        const pageSize = ctx.query.limit ? String(ctx.query.limit) : "10";
        const { title, year } = ctx.query; // Get search params

        if (title) {
          filters.$or = [
            { title: { $containsi: title as string } }
          ];
        }

        if (year) {
          filters.date = {
            $gte: `${year}-01-01`,
            $lte: `${year}-12-31`
          };
        }

        ctx.query = {
          populate: {
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
          },
          fields: [
            "title", "date"
          ],
          filters,
          sort: "date:desc",
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
    // This now checks the 'mode' we saved earlier
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
        strapi.log.warn(`Middleware: Unhandled mode '${mode}', passing full payload.`);
      }
    }
  };
};