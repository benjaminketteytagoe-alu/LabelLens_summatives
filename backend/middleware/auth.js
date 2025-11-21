const crypto = require( 'crypto' );

const JWT_SECRET = process.env.JWT_SECRET || 'replace-me-in-prod';

function signToken ( payload )
{
    const header = Buffer.from( JSON.stringify( { alg: 'HS256', typ: 'JWT' } ) ).toString( 'base64url' );
    const body = Buffer.from( JSON.stringify( payload ) ).toString( 'base64url' );
    const signature = crypto.createHmac( 'sha256', JWT_SECRET ).update( `${ header }.${ body }` ).digest( 'base64url' );
    return `${ header }.${ body }.${ signature }`;
}

function verifyToken ( token )
{
    const parts = token.split( '.' );
    if ( parts.length !== 3 )
    {
        throw new Error( 'Malformed token' );
    }

    const [ header, body, signature ] = parts;
    const expected = crypto.createHmac( 'sha256', JWT_SECRET ).update( `${ header }.${ body }` ).digest( 'base64url' );
    if ( expected !== signature )
    {
        throw new Error( 'Invalid signature' );
    }

    const payload = JSON.parse( Buffer.from( body, 'base64url' ).toString( 'utf8' ) );
    return payload;
}

function authenticate ( req, res, next )
{
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split( ' ' )[ 1 ];

    if ( !token )
    {
        return res.status( 401 ).json( { message: 'Authorization token required' } );
    }

    try
    {
        const payload = verifyToken( token );
        req.user = payload;
        next();
    } catch ( err )
    {
        return res.status( 401 ).json( { message: 'Invalid or expired token' } );
    }
}

module.exports = {
    authenticate,
    signToken
};
