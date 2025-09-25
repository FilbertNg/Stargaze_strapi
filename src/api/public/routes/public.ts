/**
 * public router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::public.public', {
    config: {
        find: {
            middlewares: ['api::public.publication-populate']
        }
    }
});
