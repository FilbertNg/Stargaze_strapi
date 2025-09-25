/**
 * new router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::new.new', {
    config: {
        find: {
            middlewares: ['api::new.news-populate']
        }
    }
});
