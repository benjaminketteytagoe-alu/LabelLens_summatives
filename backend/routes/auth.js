const express = require( 'express' );
const { authenticate, signToken } = require( '../middleware/auth' );
const { validateCredentials, getPreferences, updatePreferences } = require( '../services/userStore' );

const router = express.Router();

router.post( '/login', async ( req, res ) =>
{
    const { username, password } = req.body || {};
    if ( !username || !password || typeof username !== 'string' || typeof password !== 'string' )
    {
        return res.status( 400 ).json( { message: 'Invalid credentials payload' } );
    }

    const user = await validateCredentials( username.trim(), password );
    if ( !user )
    {
        return res.status( 401 ).json( { message: 'Invalid username or password' } );
    }

    const token = signToken( { username: user.username, iat: Date.now() } );
    res.json( { token } );
} );

router.get( '/preferences', authenticate, ( req, res ) =>
{
    const prefs = getPreferences( req.user.username );
    if ( !prefs )
    {
        return res.status( 404 ).json( { message: 'Preferences not found' } );
    }

    res.json( prefs );
} );

router.put( '/preferences', authenticate, ( req, res ) =>
{
    const { sort, nutriFilter, country } = req.body || {};
    const validSort = [ 'nutriScore', 'sugar', 'salt' ];
    const validFilter = [ 'all', 'ab', 'c', 'de' ];

    if ( ( sort && !validSort.includes( sort ) ) ||
         ( nutriFilter && !validFilter.includes( nutriFilter ) ) ||
         ( country && typeof country !== 'string' ) )
    {
        return res.status( 400 ).json( { message: 'Invalid preferences' } );
    }

    const prefs = updatePreferences( req.user.username, { sort, nutriFilter, country } );
    if ( !prefs )
    {
        return res.status( 404 ).json( { message: 'Preferences not found' } );
    }

    res.json( prefs );
} );

module.exports = router;
