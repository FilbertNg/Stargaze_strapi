import type { Core } from '@strapi/strapi';

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    strapi.log.info("In news-populate middleware.");

    const { mode, limit, page, id , title, year } = ctx.query;

    if (ctx.request.url.startsWith("/api/news")) {
      if (mode === "homepage") {
        // Case 1: homepage, based on date
        ctx.query = {
          populate: {
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
          },
          fields: ["title", "short_description", "date"],
          sort: "date:desc",
          "pagination[page]": "1",
          "pagination[pageSize]": "3",
        };
      } else if (mode === "list") {
        // Case 2: paginated list, sorted by date
        const pageSize = limit ? String(limit) : "10";
        const currentPage = page ? String(page) : "1";

        ctx.query = {
          populate: {
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
          },
          fields: ["title", "short_description", "date"],
          sort: "date:desc",
          "pagination[page]": currentPage,
          "pagination[pageSize]": pageSize,
        };
      } else if (mode === "detail" && id) {
        // Case 3: single grant with populate
        ctx.query = {
          populate: {
            cover_picture: {
              fields: ["url", "alternativeText", "caption", "width", "height"],
            },
          },
          fields: ["title", "short_description", "date", "news_content"],
          "filters[id][$eq]": String(id),
          "pagination[pageSize]": "1"
        };
      } else if (mode === "searching") {
        // Case 4: searching a specific publication
        const  filters: Record<string, any> = {};
        const currentPage = page ? String(page) : "1";
        const pageSize = limit ? String(limit) : "10";

        if (title) {
          filters.$or = [
            { title: { $containsi: title } }
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
            "title", "short_description", "date"
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
          error: "Invalid query. Use ?mode=homepage, ?mode=list, or ?mode=detail&id=...",
        };
        return; // stop here, don't call next()
      }
    }

    await next();
  };
};
