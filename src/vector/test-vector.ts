import { calculateDotProduct, calculateEuclideanDistance, calculateCosineSimilarity } from './utils/vector-math.util';
import { interpretSimilarity } from './utils/interpretation.util';
import { VectorRepository } from './vector.repository';
import { VectorService } from './vector.service';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ Assertion Failed: ${message}`);
        process.exit(1);
    }
    console.log(`✅ Passed: ${message}`);
}

async function runTests() {
    console.log('--- RUNNING VECTOR SIMILARITY TESTS ---');

    // 1. Test Math Utilities
    const vecA = [1, 0, 0, 0];
    const vecB = [0, 1, 0, 0];
    const vecC = [1, 1, 0, 0]; // magnitude = sqrt(2) = 1.4142

    // Dot product
    assert(calculateDotProduct(vecA, vecB) === 0, 'Dot product of orthogonal vectors is 0');
    assert(calculateDotProduct(vecA, vecA) === 1, 'Dot product of unit vector with itself is 1');
    assert(calculateDotProduct(vecA, vecC) === 1, 'Dot product of [1,0,0,0] and [1,1,0,0] is 1');

    // Euclidean distance
    assert(Math.abs(calculateEuclideanDistance(vecA, vecB) - Math.sqrt(2)) < 1e-7, 'Euclidean distance check');
    assert(calculateEuclideanDistance(vecA, vecA) === 0, 'Euclidean distance to itself is 0');

    // Cosine similarity
    assert(calculateCosineSimilarity(vecA, vecB) === 0, 'Cosine similarity of orthogonal vectors is 0');
    // Cosine similarity of vecA and vecC: dot = 1, magA = 1, magC = sqrt(2). 1 / (1 * sqrt(2)) = 1 / sqrt(2) = 0.7071
    assert(Math.abs(calculateCosineSimilarity(vecA, vecC) - 1 / Math.sqrt(2)) < 1e-7, 'Cosine similarity check');
    assert(calculateCosineSimilarity(vecA, vecA) === 1, 'Cosine similarity to itself is 1');

    // Cosine similarity edge case: zero magnitude
    const zeroVec = [0, 0, 0, 0];
    assert(calculateCosineSimilarity(vecA, zeroVec) === 0, 'Cosine similarity with zero-magnitude vector returns 0');

    // 2. Test Repository Initialization and Seed Data
    const repo = new VectorRepository();
    const allExamples = repo.findAll();
    console.log(`Total seed examples loaded: ${allExamples.length}`);
    assert(allExamples.length >= 220, '预设数据集/Predefined dataset has at least 220 examples');

    // Count distributions
    const counts = {
        very_similar: 0,
        related: 0,
        weakly_related: 0,
        unrelated: 0,
        opposite: 0
    };
    allExamples.forEach(ex => {
        counts[ex.relation]++;
    });
    console.log('Relation distribution count:', counts);
    assert(counts.very_similar >= 25, 'At least 25 very_similar examples');
    assert(counts.related >= 25, 'At least 25 related examples');
    assert(counts.weakly_related >= 20, 'At least 20 weakly_related examples');
    assert(counts.unrelated >= 30, 'At least 30 unrelated examples');
    assert(counts.opposite >= 15, 'At least 15 opposite examples');

    // 3. Test Service Logic
    const service = new VectorService(repo);

    // Test: valid supported pair ("car" / "vehicle")
    const resCarVehicle = service.compare("car", "vehicle");
    assert(resCarVehicle !== null, 'Found "car" and "vehicle" pair');
    if (resCarVehicle) {
        assert(resCarVehicle.relation === 'very_similar', '"car" and "vehicle" is very_similar');
        assert(resCarVehicle.metrics.cosineSimilarity >= 0.85, 'very_similar has cosine similarity >= 0.85');
        assert(resCarVehicle.textA === 'car', 'textA matches input');
        assert(resCarVehicle.textB === 'vehicle', 'textB matches input');
        console.log('Metrics for car/vehicle:', resCarVehicle.metrics);
    }

    // Test: reversed supported pair ("vehicle" / "car")
    const resVehicleCar = service.compare("vehicle", "car");
    assert(resVehicleCar !== null, 'Found reversed "vehicle" and "car" pair');
    if (resVehicleCar && resCarVehicle) {
        assert(resVehicleCar.relation === 'very_similar', 'Reversed pair has same relation');
        assert(resVehicleCar.metrics.cosineSimilarity === resCarVehicle.metrics.cosineSimilarity, 'Reversed pair has same cosine similarity');
        assert(resVehicleCar.textA === 'vehicle', 'Reversed textA matches input');
        assert(resVehicleCar.textB === 'car', 'Reversed textB matches input');
    }

    // Test: opposite concepts ("hot" / "cold")
    const resHotCold = service.compare("hot", "cold");
    assert(resHotCold !== null, 'Found "hot" and "cold" opposite pair');
    if (resHotCold) {
        assert(resHotCold.relation === 'opposite', 'hot/cold is opposite');
        assert(resHotCold.metrics.cosineSimilarity < 0, 'opposite has negative cosine similarity');
        console.log('Metrics for hot/cold:', resHotCold.metrics);
    }

    // Test: unrelated concepts ("pizza" / "database indexing")
    const resPizzaDb = service.compare("pizza", "database indexing");
    assert(resPizzaDb !== null, 'Found "pizza" and "database indexing" pair');
    if (resPizzaDb) {
        assert(resPizzaDb.relation === 'unrelated', 'pizza/database indexing is unrelated');
        assert(Math.abs(resPizzaDb.metrics.cosineSimilarity) <= 0.2, 'unrelated has similarity near 0');
        console.log('Metrics for pizza/database indexing:', resPizzaDb.metrics);
    }

    // Test: unsupported pair
    const resUnsupported = service.compare("nonexistentA", "nonexistentB");
    assert(resUnsupported === null, 'Returns null for unsupported pair');

    // 4. Test: spelling_similar_meaning_different category
    const spellingExamples = service.getExamples("spelling_similar_meaning_different");
    console.log(`Loaded spelling_similar_meaning_different examples: ${spellingExamples.length}`);
    assert(spellingExamples.length >= 25, 'At least 25 pairs in spelling_similar_meaning_different category');

    // Test Java/JavaScript (weakly_related)
    const resJavaJs = service.compare("Java", "JavaScript");
    assert(resJavaJs !== null, 'Found "Java" and "JavaScript" pair');
    if (resJavaJs) {
        assert(resJavaJs.category === 'spelling_similar_meaning_different', 'Java/JavaScript has correct category');
        assert(resJavaJs.relation === 'weakly_related', 'Java/JavaScript is weakly_related');
        assert(resJavaJs.metrics.cosineSimilarity <= 0.62, 'Java/JavaScript similarity is low (<= 0.62)');
    }

    // Test React/reactor (unrelated)
    const resReactReactor = service.compare("React", "reactor");
    assert(resReactReactor !== null, 'Found "React" and "reactor" pair');
    if (resReactReactor) {
        assert(resReactReactor.category === 'spelling_similar_meaning_different', 'React/reactor has correct category');
        assert(resReactReactor.relation === 'unrelated', 'React/reactor is unrelated');
        assert(Math.abs(resReactReactor.metrics.cosineSimilarity) <= 0.2, 'React/reactor similarity is near 0');
    }

    // Test list of categories contains the new category
    const catsAndRels = service.getCategories();
    const hasSpellingCat = catsAndRels.categories.some(c => c.name === 'spelling_similar_meaning_different');
    assert(hasSpellingCat, 'Categories includes spelling_similar_meaning_different');

    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests();
