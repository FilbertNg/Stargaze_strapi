import type { Core } from '@strapi/strapi';

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    strapi.log.info("In publication-populate middleware.");

    const { mode, limit, page, id , title, classification, type, year } = ctx.query;

    if (ctx.request.url.startsWith("/api/publics")) {
      if (mode === "homepage") {
        // Case 1: homepage → top 3
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
        const pageSize = limit ? String(limit) : "10";
        const currentPage = page ? String(page) : "1";

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
        // Case 3: single grant with populate
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
        const currentPage = page ? String(page) : "1";
        const pageSize = limit ? String(limit) : "10";

        if (title) {
          filters.$or = [
            { title: { $containsi: title } },
            { journal_name: { $containsi: title } }
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
          error: "Invalid query. Use ?mode=homepage, ?mode=list, or ?mode=detail&id=...",
        };
        return; // stop here, don't call next()
      }
    }

    await next();
  };
};
