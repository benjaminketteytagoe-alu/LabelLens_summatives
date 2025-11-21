const express = require( 'express' );
const router = express.Router();

const offService = require( '../services/openFoodFacts' );
const usdaService = require( '../services/usda' );

// GET /api/products/search?q=...&limit=...
router.get( '/search', async ( req, res ) =>
{
    const { q, limit } = req.query;
    const parsedLimit = Number( limit ) || 10;

    if ( !q || typeof q !== 'string' || q.trim().length < 2 || parsedLimit < 1 || parsedLimit > 50 )
    {
        return res.status( 400 ).json( { message: 'Invalid search parameters' } );
    }

    try
    {
        const products = await offService.searchProducts( q.trim(), parsedLimit );
        res.json( products );
    } catch ( err )
    {
        console.error( 'Error searching products:', err.message );
        res.status( 500 ).json( { message: 'Unable to search products right now.' } );
    }
} );

// GET /api/products/:barcode
router.get( '/:barcode', async ( req, res ) =>
{
    const { barcode } = req.params;
    if ( !barcode || typeof barcode !== 'string' || barcode.length < 5 || barcode.length > 20 || !/^[\w-]+$/.test( barcode ) )
    {
        return res.status( 400 ).json( { message: 'Invalid barcode' } );
    }

    try
    {
        const offProduct = await offService.getProductByBarcode( barcode );

        if ( !offProduct )
        {
            return res.status( 404 ).json( { message: 'Product not found in Open Food Facts.' } );
        }

        // Try to get USDA details using name
        let usdaDetail = null;
        try
        {
            usdaDetail = await usdaService.getNutritionByName( offProduct.name );
        } catch ( usdaErr )
        {
            console.warn( 'USDA lookup failed:', usdaErr.message );
        }

        // Compute flags
        const nutr = offProduct.nutriments;
        const sugars = nutr.sugars100g ?? null;
        const salt = nutr.salt100g ?? null;

        const highSugar = sugars !== null && sugars > 22.5; // g/100g threshold (example)
        const highSalt = salt !== null && salt > 1.5;       // g/100g threshold (example)

        const ingredientsTextLower = ( offProduct.ingredientsText || '' ).toLowerCase();
        const containsPalmOil = ingredientsTextLower.includes( 'palm oil' );

        const analysisTags = offProduct.ingredientsAnalysisTags || [];
        const vegan = analysisTags.includes( 'en:vegan' );
        const vegetarian = analysisTags.includes( 'en:vegetarian' );

        const ecoScoreMap = {
            a: 'Very low impact',
            b: 'Low impact',
            c: 'Medium impact',
            d: 'High impact',
            e: 'Very high impact'
        };

        const response = {
            barcode: offProduct.barcode,
            name: offProduct.name,
            brand: offProduct.brand,
            nutriScore: offProduct.nutriScore,
            ecoScore: offProduct.ecoScore,
            ecoScoreLabel: ecoScoreMap[ offProduct.ecoScore ] || null,
            imageUrl: offProduct.imageUrl,
            ingredientsText: offProduct.ingredientsText,
            allergens: offProduct.allergens,
            offNutriments: offProduct.nutriments,
            usdaDetail,
            flags: {
                highSugar,
                highSalt,
                containsPalmOil,
                vegan,
                vegetarian
            }
        };

        res.json( response );
    } catch ( err )
    {
        console.error( 'Error getting product detail:', err.message );
        res.status( 500 ).json( { message: 'Unable to fetch product details right now.' } );
    }
} );

module.exports = router;
