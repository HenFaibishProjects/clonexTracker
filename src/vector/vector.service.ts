import { Injectable } from '@nestjs/common';
import { VectorRepository } from './vector.repository';
import { calculateCosineSimilarity, calculateDotProduct, calculateEuclideanDistance } from './utils/vector-math.util';
import { interpretSimilarity } from './utils/interpretation.util';

export interface ComparisonSuccessResponse {
    mode: 'demo';
    textA: string;
    textB: string;
    category: string;
    relation: string;
    dimensions: number;
    metrics: {
        cosineSimilarity: number;
        dotProduct: number;
        euclideanDistance: number;
    };
    interpretation: {
        label: string;
        summary: string;
    };
    explanation: string;
    disclaimer: string;
}

export interface CleanDemoExample {
    textA: string;
    textB: string;
    category: string;
    relation: string;
    explanation: string;
    tags?: string[];
}

export interface CategorySummary {
    name: string;
    count: number;
}

export interface RelationSummary {
    name: string;
    count: number;
}

export interface CategoriesResponse {
    totalExamples: number;
    categories: CategorySummary[];
    relations: RelationSummary[];
}

@Injectable()
export class VectorService {
    constructor(private readonly vectorRepo: VectorRepository) {}

    /**
     * Compares two input texts by checking them against the predefined educational dataset.
     * Returns a ComparisonSuccessResponse if found, otherwise returns null.
     */
    compare(textA: string, textB: string): ComparisonSuccessResponse | null {
        const normA = textA.trim().toLowerCase().replace(/\s+/g, ' ');
        const normB = textB.trim().toLowerCase().replace(/\s+/g, ' ');

        const match = this.vectorRepo.findByPair(normA, normB);
        if (!match) {
            return null;
        }

        const { example, reversed } = match;
        
        // Retrieve vector components
        const rawVectorA = example.vectorA || [];
        const rawVectorB = example.vectorB || [];

        // If the match is in the reverse direction of the user input, swap the vectors 
        // to maintain alignment with the user's input textA and textB.
        const vectorA = reversed ? rawVectorB : rawVectorA;
        const vectorB = reversed ? rawVectorA : rawVectorB;

        // Calculate educational similarity metrics
        const cosSim = calculateCosineSimilarity(vectorA, vectorB);
        const dotProd = calculateDotProduct(vectorA, vectorB);
        const eucDist = calculateEuclideanDistance(vectorA, vectorB);

        // Round results to 2 decimal places for user consumption
        const roundedCosine = Number(cosSim.toFixed(2));
        const roundedDot = Number(dotProd.toFixed(2));
        const roundedEuclidean = Number(eucDist.toFixed(2));

        // Get interpretation metadata
        const interpretation = interpretSimilarity(cosSim, example.relation);

        return {
            mode: 'demo',
            textA: textA,
            textB: textB,
            category: example.category,
            relation: example.relation,
            dimensions: vectorA.length,
            metrics: {
                cosineSimilarity: roundedCosine,
                dotProduct: roundedDot,
                euclideanDistance: roundedEuclidean
            },
            interpretation: {
                label: interpretation.label,
                summary: interpretation.summary
            },
            explanation: example.explanation,
            disclaimer: 'Educational demo mode. These are predefined sample vectors, not real AI-generated embeddings.'
        };
    }

    /**
     * Retrieves the predefined examples with optional filtering and limiting,
     * mapped to exclude internal vector representations.
     */
    getExamples(category?: string, relation?: string, limit?: number): CleanDemoExample[] {
        let examples = this.vectorRepo.findAll();

        if (category) {
            const cleanCategory = category.trim().toLowerCase();
            examples = examples.filter(ex => ex.category.toLowerCase() === cleanCategory);
        }

        if (relation) {
            const cleanRelation = relation.trim().toLowerCase();
            examples = examples.filter(ex => ex.relation.toLowerCase() === cleanRelation);
        }

        if (limit && limit > 0) {
            examples = examples.slice(0, limit);
        }

        return examples.map(ex => ({
            textA: ex.textA,
            textB: ex.textB,
            category: ex.category,
            relation: ex.relation,
            explanation: ex.explanation,
            tags: ex.tags
        }));
    }

    /**
     * Retrieves categories, relations, counts, and total number of examples.
     */
    getCategories(): CategoriesResponse {
        const examples = this.vectorRepo.findAll();
        const totalExamples = examples.length;

        const categoryMap: { [key: string]: number } = {};
        const relationMap: { [key: string]: number } = {};

        for (const ex of examples) {
            categoryMap[ex.category] = (categoryMap[ex.category] || 0) + 1;
            relationMap[ex.relation] = (relationMap[ex.relation] || 0) + 1;
        }

        const categories = Object.keys(categoryMap).map(name => ({
            name,
            count: categoryMap[name]
        }));

        const relations = Object.keys(relationMap).map(name => ({
            name,
            count: relationMap[name]
        }));

        return {
            totalExamples,
            categories,
            relations
        };
    }
}
