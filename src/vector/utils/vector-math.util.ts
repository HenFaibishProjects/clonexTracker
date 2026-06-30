/**
 * Educational vector math utility.
 * Performs calculations on demo vectors.
 */

/**
 * Calculates the dot product of two vectors.
 * Throws an error if vectors have different lengths or are empty.
 */
export function calculateDotProduct(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same length.');
    }
    if (vectorA.length === 0) {
        throw new Error('Vectors must not be empty.');
    }
    
    let dotProduct = 0;
    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
    }
    return dotProduct;
}

/**
 * Calculates the Euclidean distance between two vectors.
 * Throws an error if vectors have different lengths or are empty.
 */
export function calculateEuclideanDistance(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same length.');
    }
    if (vectorA.length === 0) {
        throw new Error('Vectors must not be empty.');
    }
    
    let sumOfSquares = 0;
    for (let i = 0; i < vectorA.length; i++) {
        const diff = vectorA[i] - vectorB[i];
        sumOfSquares += diff * diff;
    }
    return Math.sqrt(sumOfSquares);
}

/**
 * Calculates the cosine similarity between two vectors.
 * Throws an error if vectors have different lengths or are empty.
 * Returns 0 if either vector has a zero magnitude.
 */
export function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same length.');
    }
    if (vectorA.length === 0) {
        throw new Error('Vectors must not be empty.');
    }
    
    const dotProduct = calculateDotProduct(vectorA, vectorB);
    
    let magASquared = 0;
    let magBSquared = 0;
    for (let i = 0; i < vectorA.length; i++) {
        magASquared += vectorA[i] * vectorA[i];
        magBSquared += vectorB[i] * vectorB[i];
    }
    
    const magA = Math.sqrt(magASquared);
    const magB = Math.sqrt(magBSquared);
    
    if (magA === 0 || magB === 0) {
        return 0; // Handle zero magnitude to avoid NaN or division by zero
    }
    
    return dotProduct / (magA * magB);
}
