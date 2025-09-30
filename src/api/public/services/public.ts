import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::public.public', ({ strapi }) => ({
    async recalculateStats() {
      strapi.log.info('Recalculating publication statistics...');
  
        // Fetch all publications
        const publications = await strapi.db
            .query('api::public.public')
            .findMany({
            select: ['indexing_classification', 'publication_type']
            });

        // Calculate total papers
        const totalPapers = publications.length;

        // Calculate Patents
        const totalPatentsGranted = publications.reduce((sum, p: any) => {
            return (p.publication_type && p.publication_type.toLowerCase?.() === "granted patent")
                ? sum + 1
                : sum;
            }, 0);

        const totalPatentsFiled = publications.reduce((sum, p: any) => {
            return (p.publication_type && p.publication_type.toLowerCase?.() === "filed patent")
                ? sum + 1
                : sum;
            }, 0);


        // Calculate indexing classification number
        const classificationCounts = publications.reduce((acc: Record<string, number>, p: any) => {
            const cls = p.indexing_classification || "patent"; // fallback if missing
            acc[cls] = (acc[cls] || 0) + 1;
            return acc;
            }, {});
    
        // append patent into categories
        classificationCounts["Patent Granted"] = totalPatentsGranted;
        classificationCounts["Patent Filed"] = totalPatentsFiled;

        // percentages JSON
        const classificationPercentages: Record<string, number> = {};
        for (const [key, count] of Object.entries(classificationCounts)) {
            const numCount = count as number; // fix TS squiggle
            classificationPercentages[key] = Number((numCount / totalPapers).toFixed(4));
          }
            
        const stats = { totalPapers, classificationCounts, classificationPercentages};
        
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
