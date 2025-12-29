import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::grants-n-project.grants-n-project', ({ strapi }) => ({
  async recalculateStats() {
    strapi.log.info('Recalculating grant statistics...');

    // Fetch all grants
    const grants = await strapi.db
      .query('api::grants-n-project.grants-n-project')
      .findMany({
        where: {
          publishedAt: {
            $ne: null, // This excludes Drafts
          },
        },
        select: ['total_funding', 'grant_status', 'type_of_grants'],
        populate: {
          project_output: {
            fields: ['master', 'phd'],
            populate: true
          }
        }
      });

    const totalFunding = grants.reduce((sum, g: any) => sum + Number(g.total_funding || 0), 0);
    const totalGrants = grants.length;

    const totalNationalGrants = grants.reduce((sum, g: any) => sum + Number(g.type_of_grants === "national grants" || 0), 0);
    const totalIndustryGrants = grants.reduce((sum, g: any) => sum + Number(g.type_of_grants === "industry grants" || 0), 0);
    const totalInternalGrants = grants.reduce((sum, g: any) => sum + Number(g.type_of_grants === "internal grants" || 0), 0);

    const totalProgressGrants = grants.reduce((sum, g: any) => sum + Number(g.grant_status === "In Progress" || 0), 0);
    const totalCompletedGrants = grants.reduce((sum, g: any) => sum + Number(g.grant_status === "Completed" || 0), 0);
    const totalDelayedGrants = grants.reduce((sum, g: any) => sum + Number(g.grant_status === "Delayed" || 0), 0);

    const totalPaper = grants.reduce((sum, g: any) => sum + Number(g.project_output?.paper_citation?.length || 0), 0);
    const totalPatent = grants.reduce((sum, g: any) => sum + Number(g.project_output?.patent_citation?.length || 0), 0);
    const totalMaster = grants.reduce((sum, g: any) => sum + Number(g.project_output?.master || 0), 0);
    const totalPhd = grants.reduce((sum, g: any) => sum + Number(g.project_output?.phd || 0), 0);

    const stats = { totalFunding, totalGrants, totalNationalGrants, totalIndustryGrants, totalInternalGrants, totalProgressGrants, totalCompletedGrants, totalDelayedGrants, totalPaper, totalPatent, totalMaster, totalPhd };

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
