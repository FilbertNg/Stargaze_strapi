const lifecycles = {
    async afterCreate(event) {
      await strapi
        .service('api::public.public')
        .recalculateStats();
    },
  
    async afterUpdate(event) {
      await strapi
        .service('api::public.public')
        .recalculateStats();
    },
  
    async afterDelete(event) {
      await strapi
        .service('api::public.public')
        .recalculateStats();  
    }
  };
  
  export default lifecycles;
  