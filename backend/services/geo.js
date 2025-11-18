const axios = require( 'axios' );

const GEODB_BASE_URL = process.env.GEODB_BASE_URL || 'https://wft-geo-db.p.rapidapi.com/v1';
const GEODB_API_KEY = process.env.GEODB_API_KEY;
const GEODB_HOST = process.env.GEODB_HOST || 'wft-geo-db.p.rapidapi.com';

// simple in-memory cache
let cachedCountries = null;

async function getCountries ()
{
    // If we already fetched them once, reuse
    if ( cachedCountries ) return cachedCountries;

    // If no API key, don't throw – just return empty list
    if ( !GEODB_API_KEY )
    {
        console.warn( 'GEODB_API_KEY not set, returning empty country list' );
        cachedCountries = [];
        return cachedCountries;
    }

    try
    {
        const url = `${ GEODB_BASE_URL }/geo/countries`;
        const headers = {
            'X-RapidAPI-Key': GEODB_API_KEY,
            'X-RapidAPI-Host': GEODB_HOST
        };
        const params = {
            limit: 200,
            sort: 'name'
        };

        const res = await axios.get( url, { headers, params } );

        const data = res.data.data || [];

        cachedCountries = data.map( c => ( {
            code: c.code,
            name: c.name,
            region: c.region
        } ) );

        return cachedCountries;
    } catch ( err )
    {
        console.error( 'GeoDB error:', err.message );
        // Critical part: DON'T throw. Just degrade gracefully.
        cachedCountries = [];
        return cachedCountries;
    }
}

module.exports = {
    getCountries
};
