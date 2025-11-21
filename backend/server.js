const express = require( 'express' );
const cors = require( 'cors' );
const dotenv = require( 'dotenv' );
const path = require( 'path' );

dotenv.config();

const productsRouter = require( './routes/products' );
const metaRouter = require( './routes/meta' );
const authRouter = require( './routes/auth' );

const app = express();

const requestCounts = new Map();

app.use( cors() );
app.use( express.json( { limit: '1mb' } ) );

// lightweight security headers without extra dependencies
app.use( ( _req, res, next ) =>
{
    res.setHeader( 'X-Content-Type-Options', 'nosniff' );
    res.setHeader( 'X-Frame-Options', 'SAMEORIGIN' );
    res.setHeader( 'Referrer-Policy', 'strict-origin-when-cross-origin' );
    next();
} );

// basic in-memory rate limiting
app.use( ( req, res, next ) =>
{
    const ip = req.ip;
    const now = Date.now();
    const entry = requestCounts.get( ip ) || { count: 0, reset: now + 5 * 60 * 1000 };

    if ( now > entry.reset )
    {
        entry.count = 0;
        entry.reset = now + 5 * 60 * 1000;
    }

    entry.count += 1;
    requestCounts.set( ip, entry );

    if ( entry.count > 200 )
    {
        return res.status( 429 ).json( { message: 'Too many requests. Please slow down.' } );
    }

    next();
} );

// API routes
app.use( '/api/products', productsRouter );
app.use( '/api/meta', metaRouter );
app.use( '/api/auth', authRouter );

// health check
app.get( '/api/health', ( req, res ) =>
{
    res.json( { status: 'ok', app: 'LabelLens backend' } );
} );

// Serve frontend static files and start server
const FRONTEND_DIR = path.join( __dirname, '../frontend' );
app.use( express.static( FRONTEND_DIR ) );

const PORT = process.env.PORT || 3000;
app.listen( PORT, () =>
{
    console.log( `LabelLens backend listening on port ${ PORT }` );
} );
