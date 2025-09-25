/**
 * grants-n-project router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::grants-n-project.grants-n-project', {
    config: {
        find: {
            middlewares: ['api::grants-n-project.grants-populate']
        }
    }
});
