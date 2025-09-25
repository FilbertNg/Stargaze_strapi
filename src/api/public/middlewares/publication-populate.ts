import type { Core } from '@strapi/strapi';

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    strapi.log.info("In publication-populate middleware.");

    const { mode, limit, page, id } = ctx.query;

    if (ctx.request.url.startsWith("/api/publics")) {
      if (mode === "homepage") {
        // Case 1: homepage → top 3, no populate
        ctx.query = {
          sort: "publishedAt:desc",
          "pagination[page]": "1",
          "pagination[pageSize]": "3",
        };
      } else if (mode === "list") {
        // Case 2: paginated list, sorted by total_fundin g
        const pageSize = limit ? String(limit) : "10";
        const currentPage = page ? String(page) : "1";

        ctx.query = {
          sort: "publishedAt:desc",
          "pagination[page]": currentPage,
          "pagination[pageSize]": pageSize,
        };
      } else if (mode === "detail" && id) {
        // Case 3: single grant with populate
        ctx.query = {
          "populate": "*",
          "filters[id][$eq]": String(id),
          "pagination[pageSize]": "1"
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
