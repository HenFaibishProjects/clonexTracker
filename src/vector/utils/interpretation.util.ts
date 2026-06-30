/**
 * Interpretation helper for similarity metrics.
 * Maps cosine similarity values and relations to user-friendly educational explanations.
 */

export interface SimilarityInterpretation {
    label: string;
    summary: string;
}

/**
 * Returns label and summary based on the cosine similarity value.
 */
export function interpretSimilarity(
    similarity: number,
    relation: string
): SimilarityInterpretation {
    let label = 'Mostly unrelated';
    let summary = 'These two demo texts appear to be semantically unrelated in this dataset.';

    if (similarity >= 0.85) {
        label = 'Very similar';
        summary = 'These two demo texts are semantically close in this educational dataset.';
    } else if (similarity >= 0.65) {
        label = 'Related';
        summary = 'These two demo texts are conceptually related, showing noticeable semantic overlap.';
    } else if (similarity >= 0.35) {
        label = 'Weakly related';
        summary = 'These two demo texts have a weak or indirect semantic relationship.';
    } else if (similarity < -0.15) {
        label = 'Opposite direction';
        summary = 'These two demo texts represent opposite or contrasting concepts.';
    } else {
        // Between -0.15 and 0.35
        label = 'Mostly unrelated';
        summary = 'These two demo texts appear to be semantically unrelated in this dataset.';
    }

    return { label, summary };
}
