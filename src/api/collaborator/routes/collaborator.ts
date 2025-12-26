/**
 * collaborator router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::collaborator.collaborator', {
    config: {
        find: {
            middlewares: ['api::collaborator.collab-populate']
        }
    }
});
