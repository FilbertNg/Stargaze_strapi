import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::public.public', ({ strapi }) => ({
    async recalculateStats() {
      strapi.log.info('Recalculating publication statistics...');
  
        // Fetch all publications
        const publications = await strapi.db
            .query('api::public.public')
            .findMany({
            select: ['classification', 'patent']
            });

        const totalPatents = publications.reduce((sum, p: any) => {
            return (p.patent && p.patent.toLowerCase?.() !== "none")
                ? sum + Number(p.patent)
                : sum;
            }, 0);

        const classificationCounts = publications.reduce((acc: Record<string, number>, p: any) => {
            const cls = p.classification || "Unclassified"; // fallback if missing
            acc[cls] = (acc[cls] || 0) + 1;
            return acc;
            }, {});
    
        const stats = { totalPapers: publications.length, totalPatents, classificationCounts};
        
        // Store stats in a single record in a "statistic" collection or even in strapi store    
        const existing = await strapi.db
            .query('api::statistic.statistic')
            .findOne({ where: { key: 'publication-stats' } });
    
        if (existing) {
            await strapi.db.query('api::statistic.statistic').update({
            where: { id: existing.id },
            data: { data: stats },
            });
        } else {
            await strapi.db.query('api::statistic.statistic').create({
            data: { key: 'publication-stats', data: stats },
            });
        }
    
        strapi.log.info('Publication statistics updated.');
    },
  }));
