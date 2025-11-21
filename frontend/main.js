// DOM elements
const searchInput = document.getElementById( 'searchInput' );
const searchBtn = document.getElementById( 'searchBtn' );
const sortSelect = document.getElementById( 'sortSelect' );
const nutriFilter = document.getElementById( 'nutriFilter' );
const countrySelect = document.getElementById( 'countrySelect' );
const savePrefsBtn = document.getElementById( 'savePrefsBtn' );
const resultsContainer = document.getElementById( 'resultsContainer' );
const detailsPanel = document.getElementById( 'detailsPanel' );
const errorBanner = document.getElementById( 'errorBanner' );
const infoBanner = document.getElementById( 'infoBanner' );
const loadingEl = document.getElementById( 'loading' );
const loginForm = document.getElementById( 'loginForm' );
const usernameInput = document.getElementById( 'usernameInput' );
const passwordInput = document.getElementById( 'passwordInput' );
const authStatus = document.getElementById( 'authStatus' );
const logoutBtn = document.getElementById( 'logoutBtn' );
const nutritionChartEl = document.getElementById( 'nutritionChart' );
const accessBadge = document.getElementById( 'accessBadge' );

let allProducts = [];
let authToken = localStorage.getItem( 'token' ) || null;
let chartInstance = null;

// Helpers to show/hide banners & loading
function showError ( message )
{
    errorBanner.textContent = message;
    errorBanner.hidden = false;
}

function clearError ()
{
    errorBanner.hidden = true;
    errorBanner.textContent = '';
}

function showInfo ( message )
{
    infoBanner.textContent = message;
    infoBanner.hidden = false;
}

function clearInfo ()
{
    infoBanner.hidden = true;
    infoBanner.textContent = '';
}

function showLoading ()
{
    loadingEl.hidden = false;
}

function hideLoading ()
{
    loadingEl.hidden = true;
}

function updateAuthUI ()
{
    const signedIn = Boolean( authToken );
    authStatus.textContent = signedIn ? '🔓 Signed in' : '🔒 Signed out';
    logoutBtn.hidden = !signedIn;
    loginForm.querySelectorAll( 'input' ).forEach( inp => inp.disabled = signedIn );

    document.body.dataset.auth = signedIn ? 'member' : 'guest';
    if ( accessBadge )
    {
        accessBadge.textContent = signedIn ? 'Member access' : 'Guest access';
        accessBadge.className = signedIn ? 'access-chip access-chip--signed' : 'access-chip';
    }
}

async function login ( event )
{
    event.preventDefault();
    clearError();

    try
    {
        const res = await fetch( '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( {
                username: usernameInput.value.trim(),
                password: passwordInput.value
            } )
        } );

        if ( !res.ok )
        {
            throw new Error( 'Invalid credentials' );
        }

        const data = await res.json();
        authToken = data.token;
        localStorage.setItem( 'token', authToken );
        updateAuthUI();
        await loadPreferences();
    } catch ( err )
    {
        showError( 'Login failed. Check username/password.' );
    }
}

function logout ()
{
    authToken = null;
    localStorage.removeItem( 'token' );
    updateAuthUI();
}

// Load countries (optional enhancement for future)
async function loadCountries ()
{
    try
    {
        const res = await fetch( '/api/meta/countries' );
        if ( !res.ok ) return;
        const countries = await res.json();

        countries.forEach( c =>
        {
            const opt = document.createElement( 'option' );
            opt.value = c.code;
            opt.textContent = `${ c.name } (${ c.region })`;
            countrySelect.appendChild( opt );
        } );
    } catch ( err )
    {
        console.warn( 'Unable to load countries', err );
    }
}

// Search products
async function searchProducts ()
{
    const query = searchInput.value.trim();
    if ( !query )
    {
        showError( 'Please enter a product name or barcode.' );
        return;
    }

    clearError();
    clearInfo();
    showLoading();

    try
    {
        const params = new URLSearchParams( { q: query, limit: 20 } );
        const res = await fetch( `/api/products/search?${ params.toString() }` );
        if ( !res.ok )
        {
            throw new Error( 'Network response was not ok' );
        }
        const products = await res.json();

        allProducts = products;
        if ( !allProducts.length )
        {
            showInfo( 'No products found for that search. Try another name.' );
        }

        applyFiltersAndRender();
    } catch ( err )
    {
        console.error( err );
        showError( 'Unable to search products right now. Please try again later.' );
    } finally
    {
        hideLoading();
    }
}

async function loadPreferences ()
{
    if ( !authToken ) return;

    try
    {
        const res = await fetch( '/api/auth/preferences', {
            headers: { Authorization: `Bearer ${ authToken }` }
        } );
        if ( !res.ok ) return;
        const prefs = await res.json();
        sortSelect.value = prefs.sort;
        nutriFilter.value = prefs.nutriFilter;
        countrySelect.value = prefs.country;
        applyFiltersAndRender();
    } catch ( err )
    {
        console.warn( 'Unable to load preferences', err );
    }
}

async function savePreferences ()
{
    if ( !authToken )
    {
        showError( 'Login to save your preferences.' );
        return;
    }

    clearError();

    try
    {
        const res = await fetch( '/api/auth/preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${ authToken }`
            },
            body: JSON.stringify( {
                sort: sortSelect.value,
                nutriFilter: nutriFilter.value,
                country: countrySelect.value
            } )
        } );

        if ( !res.ok )
        {
            throw new Error( 'Unable to save preferences' );
        }

        showInfo( 'Preferences saved for your account.' );
    } catch ( err )
    {
        showError( 'Could not save preferences right now.' );
    }
}

// Apply sort + filter (Nutri-Score only for now)
function applyFiltersAndRender ()
{
    let data = [ ...allProducts ];

    const nf = nutriFilter.value;
    if ( nf === 'ab' )
    {
        data = data.filter( p => [ 'a', 'b' ].includes( ( p.nutriScore || '' ).toLowerCase() ) );
    } else if ( nf === 'c' )
    {
        data = data.filter( p => ( p.nutriScore || '' ).toLowerCase() === 'c' );
    } else if ( nf === 'de' )
    {
        data = data.filter( p => [ 'd', 'e' ].includes( ( p.nutriScore || '' ).toLowerCase() ) );
    }

    const sortBy = sortSelect.value;
    if ( sortBy === 'sugar' )
    {
        data.sort( ( a, b ) => ( a.sugars100g ?? 9999 ) - ( b.sugars100g ?? 9999 ) );
    } else if ( sortBy === 'salt' )
    {
        data.sort( ( a, b ) => ( a.salt100g ?? 9999 ) - ( b.salt100g ?? 9999 ) );
    } else if ( sortBy === 'nutriScore' )
    {
        const order = { a: 1, b: 2, c: 3, d: 4, e: 5 };
        data.sort(
            ( a, b ) => ( order[ ( a.nutriScore || '' ).toLowerCase() ] || 99 ) -
                ( order[ ( b.nutriScore || '' ).toLowerCase() ] || 99 )
        );
    }

    renderResults( data );
}

// Render product cards
function renderResults ( products )
{
    resultsContainer.innerHTML = '';

    if ( !products.length )
    {
        resultsContainer.innerHTML = '<p>No products to show. Try a different search.</p>';
        return;
    }

    products.forEach( p =>
    {
        const card = document.createElement( 'article' );
        card.className = 'card';

        const header = document.createElement( 'div' );
        header.className = 'card-header';

        const img = document.createElement( 'img' );
        img.src = p.imageUrl || 'https://via.placeholder.com/60x60?text=No+Image';
        img.alt = p.name;

        const textBox = document.createElement( 'div' );

        const title = document.createElement( 'h3' );
        title.className = 'card-title';
        title.textContent = p.name;

        const brand = document.createElement( 'p' );
        brand.className = 'card-brand';
        brand.textContent = p.brand || 'Unknown brand';

        const badges = document.createElement( 'div' );
        badges.className = 'badges';

        const nutriBadge = document.createElement( 'span' );
        nutriBadge.className = 'badge badge-nutri';
        nutriBadge.textContent = p.nutriScore
            ? `Nutri-Score: ${ p.nutriScore.toUpperCase() }`
            : 'Nutri-Score: N/A';

        const ecoBadge = document.createElement( 'span' );
        ecoBadge.className = 'badge badge-eco';
        ecoBadge.textContent = p.ecoScore
            ? `Eco-score: ${ p.ecoScore.toUpperCase() }`
            : 'Eco-score: N/A';

        badges.appendChild( nutriBadge );
        badges.appendChild( ecoBadge );

        textBox.appendChild( title );
        textBox.appendChild( brand );
        textBox.appendChild( badges );

        header.appendChild( img );
        header.appendChild( textBox );

        const footer = document.createElement( 'div' );
        footer.className = 'card-footer';

        const detailBtn = document.createElement( 'button' );
        detailBtn.textContent = 'View details';
        detailBtn.addEventListener( 'click', () => loadProductDetails( p.barcode ) );

        footer.appendChild( detailBtn );

        card.appendChild( header );
        card.appendChild( footer );

        resultsContainer.appendChild( card );
    } );
}

// Load product detail for a given barcode
async function loadProductDetails ( barcode )
{
    clearError();
    detailsPanel.innerHTML = '<p>Loading details...</p>';

    try
    {
        const res = await fetch( `/api/products/${ barcode }` );
        if ( !res.ok )
        {
            throw new Error( 'Network error' );
        }

        const product = await res.json();
        renderDetails( product );
    } catch ( err )
    {
        console.error( err );
        detailsPanel.innerHTML = '<p>Unable to load product details right now.</p>';
    }
}

// Render details panel
function renderDetails ( p )
{
    const nutr = p.offNutriments || {};
    const flags = p.flags || {};

    const allergens = ( p.allergens || [] ).map( a => a.replace( 'en:', '' ) );

    const usdaNutrients = ( p.usdaDetail?.nutrients || [] ).slice( 0, 10 ); // first 10

    detailsPanel.innerHTML = `
    <div class="details-grid">
      <div class="details-section">
        <h3>Overview</h3>
        <p><strong>${ p.name }</strong></p>
        <p>Brand: ${ p.brand || 'Unknown' }</p>
        <p>Nutri-Score: ${ p.nutriScore ? p.nutriScore.toUpperCase() : 'N/A' }</p>
        <p>Eco-score: ${ p.ecoScore ? p.ecoScore.toUpperCase() : 'N/A' } ${ p.ecoScoreLabel ? `(${ p.ecoScoreLabel })` : '' }</p>
      </div>

      <div class="details-section">
        <h3>Key nutrients (per 100g)</h3>
        <ul class="nutrient-list">
          <li>Energy: ${ nutr.energyKcal100g ?? 'N/A' } kcal</li>
          <li>Fat: ${ nutr.fat100g ?? 'N/A' } g</li>
          <li>Saturated fat: ${ nutr.saturatedFat100g ?? 'N/A' } g</li>
          <li>Carbs: ${ nutr.carbs100g ?? 'N/A' } g</li>
          <li>Sugars: ${ nutr.sugars100g ?? 'N/A' } g</li>
          <li>Fiber: ${ nutr.fiber100g ?? 'N/A' } g</li>
          <li>Protein: ${ nutr.protein100g ?? 'N/A' } g</li>
          <li>Salt: ${ nutr.salt100g ?? 'N/A' } g</li>
        </ul>
      </div>

      <div class="details-section">
        <h3>Warnings</h3>
        <div class="flags">
          <span class="${ flags.highSugar ? 'flag-danger' : 'flag-ok' }">
            ${ flags.highSugar ? '⚠ High in sugar' : '✔ Sugar level okay' }
          </span>
          <span class="${ flags.highSalt ? 'flag-danger' : 'flag-ok' }">
            ${ flags.highSalt ? '⚠ High in salt' : '✔ Salt level okay' }
          </span>
          <span class="${ flags.containsPalmOil ? 'flag-danger' : 'flag-ok' }">
            ${ flags.containsPalmOil ? '⚠ Contains palm oil' : '✔ No palm oil detected' }
          </span>
          <span>
            Vegan: ${ flags.vegan ? 'Yes' : 'No / unknown' }
          </span>
          <span>
            Vegetarian: ${ flags.vegetarian ? 'Yes' : 'No / unknown' }
          </span>
        </div>
      </div>

      <div class="details-section">
        <h3>Allergens</h3>
        <p>${ allergens.length ? allergens.join( ', ' ) : 'No allergens listed.' }</p>
        <h3>Ingredients</h3>
        <p>${ p.ingredientsText || 'No ingredients text available.' }</p>
      </div>

      <div class="details-section">
        <h3>USDA extra data</h3>
        ${ usdaNutrients.length
            ? `<ul class="nutrient-list">
                ${ usdaNutrients
                .map( n => `<li>${ n.name }: ${ n.amount } ${ n.unit }</li>` )
                .join( '' ) }
               </ul>`
            : '<p>No extra USDA data available for this product.</p>'
        }
      </div>
    </div>
  `;

    renderNutritionChart( nutr );
}

function renderNutritionChart ( nutr )
{
    const labels = [ 'Fat', 'Saturated fat', 'Carbs', 'Sugars', 'Fiber', 'Protein', 'Salt' ];
    const values = [
        nutr.fat100g ?? 0,
        nutr.saturatedFat100g ?? 0,
        nutr.carbs100g ?? 0,
        nutr.sugars100g ?? 0,
        nutr.fiber100g ?? 0,
        nutr.protein100g ?? 0,
        nutr.salt100g ?? 0
    ];

    if ( chartInstance )
    {
        chartInstance.destroy();
    }

    chartInstance = new Chart( nutritionChartEl, {
        type: 'radar',
        data: {
            labels,
            datasets: [
                {
                    label: 'per 100g',
                    data: values,
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    borderColor: '#2563eb'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: { maxTicksLimit: 5 }
                }
            }
        }
    } );
}

// Event listeners
searchBtn.addEventListener( 'click', searchProducts );

// Allow Enter key to trigger search
searchInput.addEventListener( 'keydown', ( e ) =>
{
    if ( e.key === 'Enter' )
    {
        searchProducts();
    }
} );

sortSelect.addEventListener( 'change', applyFiltersAndRender );
nutriFilter.addEventListener( 'change', applyFiltersAndRender );
loginForm.addEventListener( 'submit', login );
logoutBtn.addEventListener( 'click', logout );
savePrefsBtn.addEventListener( 'click', savePreferences );

// Initial load
loadCountries();
updateAuthUI();
loadPreferences();
