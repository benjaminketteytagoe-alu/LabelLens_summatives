const axios = require( 'axios' );
const { getCached, setCached } = require( './cache' );

const OFF_BASE_URL = process.env.OFF_BASE_URL || 'https://world.openfoodfacts.net';

// Common headers: OFF likes a clear User-Agent
const OFF_HEADERS = {
    'User-Agent': 'LabelLens/1.0 (student project; benjamin@example.com)'
};

async function searchProducts ( query, limit = 10 )
{
    const cacheKey = `off:search:${ query }:${ limit }`;
    const cached = getCached( cacheKey );
    if ( cached ) return cached;

    const url = `${ OFF_BASE_URL }/cgi/search.pl`;
    const params = {
        search_terms: query,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: limit
    };

    const res = await axios.get( url, { params, headers: OFF_HEADERS } );

    const products = res.data.products || [];

    const normalized = products.map( p => ( {
        barcode: p.code,
        name: p.product_name || p.generic_name || 'Unknown product',
        brand: p.brands || 'Unknown brand',
        nutriScore: p.nutriscore_grade || null,
        ecoScore: p.ecoscore_grade || null,
        imageUrl: p.image_front_small_url || p.image_url || null,
        // preliminary nutriments for sorting
        sugars100g: p.nutriments?.sugars_100g ?? null,
        salt100g: p.nutriments?.salt_100g ?? null
    } ) ).filter( p => p.barcode ); // only keep products with a barcode

    setCached( cacheKey, normalized );
    return normalized;
}

async function getProductByBarcode ( barcode )
{
    const cacheKey = `off:product:${ barcode }`;
    const cached = getCached( cacheKey );
    if ( cached ) return cached;

    const url = `${ OFF_BASE_URL }/api/v2/product/${ barcode }`;
    const params = {
        fields: [
            'code',
            'product_name',
            'brands',
            'nutriscore_grade',
            'ecoscore_grade',
            'image_front_small_url',
            'nutriments',
            'ingredients_text',
            'allergens_hierarchy',
            'ingredients_analysis_tags'
        ].join( ',' )
    };

    const res = await axios.get( url, { params, headers: OFF_HEADERS } );

    if ( !res.data || res.data.status !== 1 )
    {
        return null;
    }

    const p = res.data.product;

    const nutr = p.nutriments || {};

    const normalized = {
        barcode: p.code,
        name: p.product_name || 'Unknown product',
        brand: p.brands || 'Unknown brand',
        nutriScore: p.nutriscore_grade || null,
        ecoScore: p.ecoscore_grade || null,
        imageUrl: p.image_front_small_url || null,
        ingredientsText: p.ingredients_text || '',
        allergens: p.allergens_hierarchy || [],
        ingredientsAnalysisTags: p.ingredients_analysis_tags || [],
        nutriments: {
            energyKcal100g: nutr[ 'energy-kcal_100g' ] ?? nutr[ 'energy-kcal' ] ?? null,
            fat100g: nutr.fat_100g ?? null,
            saturatedFat100g: nutr[ 'saturated-fat_100g' ] ?? null,
            carbs100g: nutr.carbohydrates_100g ?? null,
            sugars100g: nutr.sugars_100g ?? null,
            fiber100g: nutr.fiber_100g ?? null,
            protein100g: nutr.proteins_100g ?? null,
            salt100g: nutr.salt_100g ?? null
        }
    };

    setCached( cacheKey, normalized );
    return normalized;
}

module.exports = {
    searchProducts,
    getProductByBarcode
};
