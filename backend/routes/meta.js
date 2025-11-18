const express = require( 'express' );
const router = express.Router();

const geoService = require( '../services/geo' );

// GET /api/meta/countries
router.get( '/countries', async ( req, res ) =>
{
    try
    {
        const countries = await geoService.getCountries();
        res.json( countries );   // will be [] if API not available
    } catch ( err )
    {
        console.error( 'Error fetching countries:', err.message );
        res.status( 500 ).json( { message: 'Unable to fetch countries right now.' } );
    }
} );

module.exports = router;
