import type { Core } from '@strapi/strapi';

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    strapi.log.info('In stats-populate middleware.');

    const mode = ctx.query.mode;

    // use path so query string doesn't interfere
    if (ctx.path.startsWith('/api/statistics')) {
      try {
        if (mode === 'grants') {
          const grantsStats = await strapi.db
            .query('api::statistic.statistic')
            .findOne({
              where: { key: 'grant-stats' },
              select: ['data'],
            });

          if (grantsStats) {
            ctx.status = 200;
            ctx.body = grantsStats.data;
          } else {
            ctx.status = 404;
            ctx.body = { message: 'No data found for grant-stats' };
          }
          return; // stop here
        }

        if (mode === 'publication') {
          const publicationStats = await strapi.db
            .query('api::statistic.statistic')
            .findOne({
              where: { key: 'publication-stats' },
              select: ['data'],
            });

          if (publicationStats) {
            ctx.status = 200;
            ctx.body = publicationStats.data;
          } else {
            ctx.status = 404;
            ctx.body = { message: 'No data found for publication-stats' };
          }
          return; // stop here
        }

        // invalid mode
        ctx.status = 400;
        ctx.body = { error: 'Invalid query. Use ?mode=grants or ?mode=publication' };
        return;
      } catch (err) {
        strapi.log.error('Error fetching stats:', err);
        ctx.status = 500;
        ctx.body = { error: 'Internal server error' };
        return;
      }
    }

    await next();
  };
};
