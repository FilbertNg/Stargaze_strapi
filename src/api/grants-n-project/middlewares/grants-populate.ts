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

    const { mode, limit, page, id, pi_name, title, year } = ctx.query;

    if (ctx.request.url.startsWith("/api/grants-n-projects")) {
      if (mode === "homepage") {
        // Case 1: homepage → top 3, no populate
        ctx.query = {
          fields: ["project_title", "pi_name", "total_funding", "type_of_grants", "grant_scheme_name", "grant_code", "start_date", "end_date", "citation"],
          sort: "total_funding:desc",
          "pagination[page]": "1",
          "pagination[pageSize]": "3",
        };
      } else if (mode === "list") {
        // Case 2: paginated list, sorted by total_funding
        const pageSize = limit ? String(limit) : "10";
        const currentPage = page ? String(page) : "1";

        ctx.query = {
          fields: ["project_title", "pi_name", "total_funding", "type_of_grants", "grant_scheme_name", "grant_code", "start_date", "end_date", "citation"],
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
        const filters: Record<string, any> = {};
        const currentPage = page ? String(page) : "1";
        const pageSize = limit ? String(limit) : "10";

        const filterConditions = [];

        if (pi_name) {
          filterConditions.push({
            $or: [
              { pi_name: { $containsi: pi_name } },
            ],
          });
        }

        if (title) {
          filterConditions.push({
            $or: [
              { project_title: { $containsi: title } },
              { grant_scheme_name: { $containsi: title } }
            ]
          });
        }

        if (year) {
          filterConditions.push({
            $or: [
              {
                start_date: {
                  $gte: `${year}-01-01`,
                  $lte: `${year}-12-31`
                }
              },
              {
                end_date: {
                  $gte: `${year}-01-01`,
                  $lte: `${year}-12-31`
                }
              }
            ]
          });
        }

        ctx.query = {
          fields: [
            "project_title", "pi_name", "total_funding", "type_of_grants", "grant_scheme_name", "grant_code", "start_date", "end_date", "citation"
          ],
          filters: {
            $and: filterConditions
          },
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
