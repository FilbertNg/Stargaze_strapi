import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::public.public', ({ strapi }) => ({
    async recalculateStats() {
        strapi.log.info('Recalculating publication statistics...');

        // Fetch all publications
        const publications = await strapi.db
            .query('api::public.public')
            .findMany({
                where: {
                    publishedAt: {
                        $ne: null, // This excludes Drafts
                    },
                },
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


        // initialize the classification number
        const fixedClasses = [
            "WWoS Q1",
            "WWoS Q2",
            "WWoS Q3",
            "WWoS Q4",
            "Conference Paper",
            "Scopus-indexed",
            "Non-indexed"
        ];
        const classificationCounts = fixedClasses.reduce((acc, cls) => {
            acc[cls] = 0;
            return acc;
        }, {} as Record<string, number>);

        // Calculate indexing classification number
        for (const p of publications) {
            const cls = p.indexing_classification;
            if (fixedClasses.includes(cls)) {
                classificationCounts[cls]++;
            }
        }


        // append patent into categories
        classificationCounts["Patent Granted"] = totalPatentsGranted;
        classificationCounts["Patent Filed"] = totalPatentsFiled;

        const stats = { totalPapers, classificationCounts };

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
