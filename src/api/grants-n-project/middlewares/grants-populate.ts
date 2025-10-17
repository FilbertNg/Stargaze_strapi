import type { Core } from '@strapi/strapi';

const fullPopulate = {
  populate: {
    collaborator: {
      fields: ["name", "type"],
      populate: {
        logo: {
          fields: ["url", "alternativeText", "caption", "width", "height"],
        },
      },
    },
    graphical_abstract: {
      fields: ["url", "alternativeText", "caption", "width", "height"],
    },
    team_members: true, // gets all fields
    project_output: {
      populate: "*", // include everything inside project_output
    },
  },
};


export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    strapi.log.info("In grants-populate middleware.");

    const { mode, limit, page, id , name, year} = ctx.query;

    if (ctx.request.url.startsWith("/api/grants-n-projects")) {
      if (mode === "homepage") {
        // Case 1: homepage → top 3, no populate
        ctx.query = {
          fields: ["project_title", "pi_name", "total_funding","type_of_grants", "grant_scheme_name", "grant_code", "start_date", "end_date", "citation"],
          sort: "total_funding:desc",
          "pagination[page]": "1",
          "pagination[pageSize]": "3",
        };
      } else if (mode === "list") {
        // Case 2: paginated list, sorted by total_funding
        const pageSize = limit ? String(limit) : "10";
        const currentPage = page ? String(page) : "1";

        ctx.query = {
          fields: ["project_title", "pi_name", "total_funding","type_of_grants", "grant_scheme_name", "grant_code", "start_date", "end_date", "citation"],
          sort: "total_funding:desc",
          "pagination[page]": currentPage,
          "pagination[pageSize]": pageSize,
        };
      } else if (mode === "detail" && id) {
        // Case 3: single grant with populate
        ctx.query = {
          ...fullPopulate,
          "filters[id][$eq]": String(id),
          "pagination[pageSize]": "1"
        };
      } else if (mode === "searching") {
        // Case 4: searching a specific publication
        const  filters: Record<string, any> = {};
        const currentPage = page ? String(page) : "1";
        const pageSize = limit ? String(limit) : "10";

        if (name) {
          filters.$or = [
            { project_title: { $containsi: name } },
            { pi_name: { $containsi: name } },
            { grant_scheme_name: { $containsi: name } }
          ];
        }

        if (year) {
          filters.start_date = {
            $gte: `${year}-01-01`,
            $lte: `${year}-12-31`
          };
        }

        ctx.query = {
          fields: [
            "project_title", "pi_name", "total_funding","type_of_grants", "grant_scheme_name", "grant_code", "start_date", "end_date", "citation"
          ],
          filters,
          sort: "total_funding:desc",
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
    if (ctx.body && ctx.body.data !== undefined) {
      ctx.body = ctx.body.data;
      ctx.status = 200;
    }
  };
};
