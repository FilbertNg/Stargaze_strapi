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
        selectedFormat = formats.thumbnail;
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
        strapi.log.info("In collaborators-populate middleware.");

        const { mode, id } = ctx.query;

        if (ctx.request.url.startsWith("/api/collaborators")) {
            if (mode === "homepage") {
                // Case 1: homepage
                ctx.query = {
                    populate: {
                        logo: { fields: imageFields }
                    },
                    fields: ["name"],
                    "pagination[page]": "1",
                    "pagination[pageSize]": "100",
                };
            } else if (mode === "detail" && id) {
                // Case 2: single item
                ctx.query = {
                    populate: {
                        logo: { fields: imageFields },
                        grants_and_projects: {
                            fields: ["id", "project_title", "grant_scheme_name", "grant_code", "pi_name", "start_date", "end_date", "total_funding"]
                        }
                    },
                    fields: ["name", "link", "description"],
                    "filters[id][$eq]": String(id),
                    "pagination[pageSize]": "1"
                };
            } else {
                ctx.status = 400;
                ctx.body = { error: "Invalid query. Use ?mode=homepage, or ?mode=detail&id=..." };
                return;
            }
        }

        await next();

        // **MODIFIED RESPONSE FORMATTING**
        if (ctx.body && ctx.body.data) {

            // 1. Process Images FIRST based on mode
            if (Array.isArray(ctx.body.data)) {
                ctx.body.data = ctx.body.data.map((item) => {
                    if (mode === 'homepage') {
                        return resizeImage(item, 'thumbnail');
                    } else if (mode === 'detail') {
                        return resizeImage(item, 'medium');
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
            }
        }
    };
};