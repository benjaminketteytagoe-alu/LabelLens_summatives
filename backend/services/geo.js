const GEODB_BASE_URL = process.env.GEODB_BASE_URL || 'https://wft-geo-db.p.rapidapi.com/v1';
const GEODB_API_KEY = process.env.GEODB_API_KEY;
const GEODB_HOST = process.env.GEODB_HOST || 'wft-geo-db.p.rapidapi.com';

// services/geo.js
const axios = require( 'axios' );

// simple in-memory cache
let cachedCountries = null;

async function getCountries ()
{
    // If we already fetched them once, reuse
    if ( cachedCountries ) return cachedCountries;

    try
    {
        const url = 'https://restcountries.com/v3.1/all';
        const res = await axios.get( url );

        const data = res.data || [];

        cachedCountries = data
            .map( c => ( {
                code: c.cca2,               // e.g. "RW"
                name: c.name?.common || '', // e.g. "Rwanda"
                region: c.region || null    // e.g. "Africa"
            } ) )
            .filter( c => c.code && c.name )
            .sort( ( a, b ) => a.name.localeCompare( b.name ) );

        return cachedCountries;
    } catch ( err )
    {
        console.error( 'RestCountries error:', err.message );
        cachedCountries = [];
        return cachedCountries;
    }
}

module.exports = {
    getCountries
};

