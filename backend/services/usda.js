const axios = require( 'axios' );
const { getCached, setCached } = require( './cache' );

const USDA_BASE_URL = process.env.USDA_BASE_URL || 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = process.env.USDA_API_KEY;

async function getNutritionByName ( name )
{
    if ( !USDA_API_KEY )
    {
        console.warn( 'USDA_API_KEY not set, skipping USDA call' );
        return null;
    }

    const cacheKey = `usda:${ name }`;
    const cached = getCached( cacheKey );
    if ( cached ) return cached;

    const url = `${ USDA_BASE_URL }/foods/search`;
    const params = {
        api_key: USDA_API_KEY,
        query: name,
        pageSize: 1
    };

    const res = await axios.get( url, { params } );

    const foods = res.data.foods || [];
    if ( !foods.length ) return null;

    const food = foods[ 0 ];

    // foodNutrients is an array
    const nutrients = ( food.foodNutrients || [] ).map( n => ( {
        name: n.nutrientName,
        unit: n.unitName,
        amount: n.value
    } ) );

    const normalized = {
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        nutrients
    };

    setCached( cacheKey, normalized );
    return normalized;
}

module.exports = {
    getNutritionByName
};
