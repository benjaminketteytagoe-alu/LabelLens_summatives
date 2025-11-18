const express = require( 'express' );
const cors = require( 'cors' );
const dotenv = require( 'dotenv' );
const path = require( 'path' );

dotenv.config();

const productsRouter = require( './routes/products' );
const metaRouter = require( './routes/meta' );

const app = express();

app.use( cors() );
app.use( express.json() );

// API routes
app.use( '/api/products', productsRouter );
app.use( '/api/meta', metaRouter );

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
