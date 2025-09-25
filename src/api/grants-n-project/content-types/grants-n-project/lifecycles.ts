const lifecycles = {
  async afterCreate(event) {
    await strapi
      .service('api::grants-n-project.grants-n-project')
      .recalculateStats();
  },

  async afterUpdate(event) {
    await strapi
      .service('api::grants-n-project.grants-n-project')
      .recalculateStats();
  },

  async afterDelete(event) {
    await strapi
      .service('api::grants-n-project.grants-n-project')
      .recalculateStats();  
  }
};

export default lifecycles;
