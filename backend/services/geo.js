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
        // RestCountries now requires fields to be specified for /all
        const url = 'https://restcountries.com/v3.1/all?fields=cca2,name,region';

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
        // Make debugging nicer in future
        console.error(
            'RestCountries error:',
            err.response?.status,
            err.response?.data || err.message
        );
        cachedCountries = [];
        return cachedCountries;
    }
}

module.exports = {
    getCountries
};
