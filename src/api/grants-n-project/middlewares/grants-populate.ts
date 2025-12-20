import type { Core } from '@strapi/strapi';

// --- HELPER: Define the specific fields we want to fetch ---
// We include 'formats' internally so we can resize, but we delete it later.
const imageFields = ["url", "name", "caption", "alternativeText", "width", "height", "mime", "size", "formats"];

// --- HELPER: Swaps the main URL with the optimized size ---
const resizeImage = (entry: any, fieldName: string, sizePreference: 'small' | 'medium' | 'large') => {
  // Check if the specific field exists on the entry
  if (!entry || !entry[fieldName] || !entry[fieldName].formats) return;

  const formats = entry[fieldName].formats;
  let selectedFormat = null;

  // Logic: Try the preferred size, fall back to others if missing
  if (sizePreference === 'small') {
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

// --- HELPER: Object definition for populating images in lists ---
// We use this to ensure we fetch images in list/homepage/search modes
const listPopulate = {
  graphical_abstract: {
    fields: imageFields,
  },
  collaborator: {
    fields: ["name", "type"],
    populate: {
      logo: {
        fields: imageFields,
      },
    },
  },
};

const fullPopulate = {
  populate: {
    collaborator: {
      fields: ["name", "type"],
      populate: {
        logo: {
          fields: imageFields,
        },
      },
    },
    graphical_abstract: {
      fields: imageFields,
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
        // Case 1: homepage 
        ctx.query = {
          fields: ["project_title", "pi_name", "total_funding", "type_of_grants", "grant_scheme_name", "grant_code", "start_date", "end_date"],
          sort: "total_funding:desc",
          "pagination[page]": "1",
          "pagination[pageSize]": "3",
        };
      } else if (mode === "list") {
        // Case 2: paginated list
        const pageSize = limit ? String(limit) : "10";
        const currentPage = page ? String(page) : "1";

        ctx.query = {
          fields: ["project_title", "pi_name", "total_funding", "type_of_grants", "grant_scheme_name", "grant_code", "start_date", "end_date"],
          sort: "total_funding:desc",
          "pagination[page]": currentPage,
          "pagination[pageSize]": pageSize,
        };
      } else if (mode === "detail" && id) {
        // Case 3: single grant
        ctx.query = {
          ...fullPopulate,
          "filters[id][$eq]": String(id),
          "pagination[pageSize]": "1"
        };
      } else if (mode === "searching") {
        // Case 4: searching
        const currentPage = page ? String(page) : "1";
        const pageSize = limit ? String(limit) : "10";

        const filterConditions = [];

        if (pi_name) filterConditions.push({ $or: [{ pi_name: { $containsi: pi_name } }] });
        if (title) filterConditions.push({ $or: [{ project_title: { $containsi: title } }, { grant_scheme_name: { $containsi: title } }] });
        if (year) {
          filterConditions.push({
            $or: [
              { start_date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } },
              { end_date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } }
            ]
          });
        }

        ctx.query = {
          fields: ["project_title", "pi_name", "total_funding", "type_of_grants", "grant_scheme_name", "grant_code", "start_date", "end_date"],
          filters: { $and: filterConditions },
          sort: "total_funding:desc",
          "pagination[pageSize]": pageSize,
          "pagination[page]": currentPage
        };
      } else {
        ctx.status = 400;
        ctx.body = { error: "Invalid query. Use ?mode=homepage, ?mode=list, or ?mode=detail&id=..." };
        return;
      }
    }

    await next();

    // ** IMAGE RESIZING LOGIC **
    if (ctx.body && ctx.body.data) {
      const targetSize = (mode === 'detail') ? 'large' : 'small';
      const dataItems = Array.isArray(ctx.body.data) ? ctx.body.data : [ctx.body.data];
      dataItems.forEach((item) => {
        resizeImage(item, 'graphical_abstract', targetSize);

        if (item.collaborator) {
          const collaborators = Array.isArray(item.collaborator) ? item.collaborator : [item.collaborator];
          collaborators.forEach((collab) => {
            resizeImage(collab, 'logo', 'small');
          });
        }
      });

      // ** STANDARD RESPONSE FORMATTING **
      if (mode === 'homepage') {
        strapi.log.info('Middleware: Formatting for homepage (data array).');
        ctx.body = ctx.body.data;
      } else if (mode === 'detail' && id) {
        strapi.log.info('Middleware: Formatting for detail (single item).');
        ctx.body = ctx.body.data.length > 0 ? ctx.body.data[0] : null;
      } else if (mode === 'list' || mode === 'searching') {
        strapi.log.info('Middleware: Formatting for list/search (full payload).');
        // Pass full payload
      }
    }
  };
};