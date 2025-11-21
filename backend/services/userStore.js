const crypto = require( 'crypto' );

// Demo users; in production replace with database lookup.
const USERS = [
    {
        username: 'demo',
        passwordHash: crypto.createHash( 'sha256' ).update( 'Password123!' ).digest( 'hex' ),
        preferences: {
            sort: 'nutriScore',
            nutriFilter: 'all',
            country: ''
        }
    }
];

function findUser ( username )
{
    return USERS.find( u => u.username === username );
}

async function validateCredentials ( username, password )
{
    const user = findUser( username );
    if ( !user ) return null;

    const hash = crypto.createHash( 'sha256' ).update( password ).digest( 'hex' );
    const valid = hash === user.passwordHash;
    return valid ? user : null;
}

function getPreferences ( username )
{
    const user = findUser( username );
    return user?.preferences || null;
}

function updatePreferences ( username, prefs )
{
    const user = findUser( username );
    if ( !user ) return null;

    user.preferences = {
        ...user.preferences,
        ...prefs
    };

    return user.preferences;
}

module.exports = {
    validateCredentials,
    getPreferences,
    updatePreferences
};
