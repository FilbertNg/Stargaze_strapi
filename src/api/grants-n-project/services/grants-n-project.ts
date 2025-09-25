import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::grants-n-project.grants-n-project', ({ strapi }) => ({
  async recalculateStats() {
    strapi.log.info('Recalculating grant statistics...');

    // Fetch all grants
    const grants = await strapi.db
      .query('api::grants-n-project.grants-n-project')
      .findMany({
        select: ['total_funding', 'publishedAt'],
        populate: { collaborator: { select: ['type'] } }
      });

    const totalFunding = grants.reduce((sum, g: any) => sum + Number(g.total_funding || 0), 0);

    const totalNationalGrants = grants.reduce((sum, g:any) => sum + Number(g.collaborator.filter((c: any) => c.type === "institution").length), 0);
    const totalIndustryGrants = grants.reduce((sum, g:any) => sum + Number(g.collaborator.filter((c: any) => c.type === "company").length), 0);
    const totalInternalGrants = grants.reduce((sum, g:any) => sum + Number(g.collaborator.filter((c: any) => c.type === "researcher").length), 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const grantsThisMonth = grants.filter((g: any) => {
      if (!g.publishedAt) return false;
      const d = new Date(g.publishedAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const stats = { totalFunding, grantsThisMonth, totalGrants: grants.length, totalNationalGrants, totalIndustryGrants, totalInternalGrants };
    
    // Store stats in a single record in a "statistic" collection or even in strapi store    
    const existing = await strapi.db
      .query('api::statistic.statistic')
      .findOne({ where: { key: 'grant-stats' } });

    if (existing) {
      await strapi.db.query('api::statistic.statistic').update({
        where: { id: existing.id },
        data: { data: stats },
      });
    } else {
      await strapi.db.query('api::statistic.statistic').create({
        data: { key: 'grant-stats', data: stats },
      });
    }

    strapi.log.info('Grant statistics updated.');
  },
}));
