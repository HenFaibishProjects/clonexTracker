import { Injectable } from '@nestjs/common';
import { DemoExample, allDemoExamples } from './vector-demo-data';

@Injectable()
export class VectorRepository {
    private readonly examples: DemoExample[];

    constructor() {
        this.examples = this.initializeExamples();
    }

    /**
     * Initializes all predefined examples with normalized texts and deterministic vectors.
     */
    private initializeExamples(): DemoExample[] {
        return allDemoExamples.map((ex, index) => {
            const normA = ex.textA.trim().toLowerCase().replace(/\s+/g, ' ');
            const normB = ex.textB.trim().toLowerCase().replace(/\s+/g, ' ');

            // Generate deterministic vector embeddings
            const { vectorA, vectorB } = this.generateDeterministicVectors(
                normA,
                normB,
                ex.relation,
                index
            );

            return {
                ...ex,
                normalizedTextA: normA,
                normalizedTextB: normB,
                vectorA,
                vectorB,
            };
        });
    }

    /**
     * Generates a pair of deterministic unit vectors with a cosine similarity matching the relation type.
     */
    private generateDeterministicVectors(
        textA: string,
        textB: string,
        relation: string,
        index: number
    ): { vectorA: number[]; vectorB: number[] } {
        // Create a unique seed string for this pair
        const seedStr = `${textA}||${textB}||${relation}||${index}`;
        const random = this.getDeterministicRandom(seedStr);
        const dimensions = 8;

        // 1. Generate vectorA as a random unit vector
        const u = Array.from({ length: dimensions }, () => random() * 2 - 1);
        const magU = Math.sqrt(u.reduce((sum, val) => sum + val * val, 0));
        const vectorA = u.map(val => Number((magU === 0 ? 0 : val / magU).toFixed(4)));

        // 2. Generate vector v, orthogonalize it against vectorA to get wNorm
        const v = Array.from({ length: dimensions }, () => random() * 2 - 1);
        const dotUV = v.reduce((sum, val, i) => sum + val * vectorA[i], 0);
        const w = v.map((val, i) => val - dotUV * vectorA[i]);
        const magW = Math.sqrt(w.reduce((sum, val) => sum + val * val, 0));

        let wNorm = w.map(val => (magW === 0 ? 0 : val / magW));
        if (magW === 0) {
            // Fallback in case orthogonal vector is exactly zero magnitude
            wNorm = Array(dimensions).fill(0);
            wNorm[0] = 1;
            const dotUFall = wNorm.reduce((sum, val, i) => sum + val * vectorA[i], 0);
            const wFall = wNorm.map((val, i) => val - dotUFall * vectorA[i]);
            const magWFall = Math.sqrt(wFall.reduce((sum, val) => sum + val * val, 0));
            wNorm = wFall.map(val => (magWFall === 0 ? 0 : val / magWFall));
        }

        // 3. Define target similarity range based on relation
        let targetSim = 0;
        if (relation === 'very_similar') {
            // Range [0.85, 0.96]
            targetSim = 0.85 + random() * 0.11;
        } else if (relation === 'related') {
            // Range [0.66, 0.83]
            targetSim = 0.66 + random() * 0.17;
        } else if (relation === 'weakly_related') {
            // Range [0.36, 0.62]
            targetSim = 0.36 + random() * 0.26;
        } else if (relation === 'opposite') {
            // Range [-0.80, -0.20]
            targetSim = -0.80 + random() * 0.60;
        } else {
            // unrelated: Range [-0.15, 0.15]
            targetSim = -0.15 + random() * 0.30;
        }

        // 4. Calculate vectorB = targetSim * vectorA + sqrt(1 - targetSim^2) * wNorm
        const cosTheta = targetSim;
        const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
        const vectorB = vectorA.map((a, i) =>
            Number((cosTheta * a + sinTheta * wNorm[i]).toFixed(4))
        );

        return { vectorA, vectorB };
    }

    /**
     * Seedable LCG PRNG helper for deterministic outcomes.
     */
    private getDeterministicRandom(seedStr: string): () => number {
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
            hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        return function () {
            hash = (hash * 1664525 + 1013904223) % 4294967296;
            return (hash >>> 0) / 4294967296;
        };
    }

    /**
     * Returns all examples.
     */
    findAll(): DemoExample[] {
        return this.examples;
    }

    /**
     * Looks up a pair of texts in either forward or reverse order.
     */
    findByPair(normA: string, normB: string): { example: DemoExample; reversed: boolean } | null {
        const found = this.examples.find(
            ex =>
                (ex.normalizedTextA === normA && ex.normalizedTextB === normB) ||
                (ex.normalizedTextA === normB && ex.normalizedTextB === normA)
        );

        if (!found) return null;

        const reversed = found.normalizedTextA !== normA;
        return { example: found, reversed };
    }
}
