const DEFAULT_TTL = Number( process.env.CACHE_TTL_SECONDS ) || 300;
const store = new Map();

function getCached ( key )
{
    const entry = store.get( key );
    if ( !entry ) return null;

    if ( entry.expires < Date.now() )
    {
        store.delete( key );
        return null;
    }

    return entry.value;
}

function setCached ( key, value, ttl = DEFAULT_TTL )
{
    store.set( key, { value, expires: Date.now() + ttl * 1000 } );
}

module.exports = {
    getCached,
    setCached
};
