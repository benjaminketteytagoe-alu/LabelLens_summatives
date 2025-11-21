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

    const warningFlags = [
        {
            active: flags.highSugar,
            label: 'High in sugar',
            detail: `${ nutr.sugars100g ?? 'N/A' } g sugars / 100g`,
            tone: 'sugar'
        },
        {
            active: flags.highSalt,
            label: 'High in salt',
            detail: `${ nutr.salt100g ?? 'N/A' } g salt / 100g`,
            tone: 'salt'
        },
        {
            active: flags.containsPalmOil,
            label: 'Contains palm oil',
            detail: 'Palm oil present in ingredients',
            tone: 'palm'
        }
    ];

    const anyAlerts = warningFlags.some( w => w.active );

    detailsPanel.innerHTML = `
    <div class="dash-header">
      <div>
        <p class="pill-label">Selected product</p>
        <h3 class="dash-title">${ p.name }</h3>
        <p class="dash-sub">${ p.brand || 'Unknown' }${ p.countries ? ` · ${ p.countries }` : '' }</p>
        <div class="dash-chips">
          <span class="chip chip-line">Barcode ${ p.barcode }</span>
          <span class="chip chip-strong">Nutri-Score ${ ( p.nutriScore || 'N/A' ).toString().toUpperCase() }</span>
          <span class="chip chip-soft">Eco-score ${ ( p.ecoScore || 'N/A' ).toString().toUpperCase() }</span>
        </div>
      </div>
      <div class="dash-callout ${ anyAlerts ? 'dash-callout--alert' : 'dash-callout--ok' }">
        <p class="callout-title">${ anyAlerts ? 'Warnings detected' : 'No critical warnings' }</p>
        <p class="callout-body">${ anyAlerts
            ? 'Check the flagged items below before choosing this product.'
            : 'This product does not trigger sugar, salt, or palm-oil warnings.'
        }</p>
      </div>
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head">
          <p class="pill-label">Vitals</p>
          <h4>Nutrition snapshot</h4>
        </div>
        <div class="score-grid">
          <div class="score-card">
            <p class="score-label">Energy</p>
            <p class="score-value">${ nutr.energyKcal100g ?? 'N/A' }</p>
            <small>kcal per 100g</small>
          </div>
          <div class="score-card">
            <p class="score-label">Sugars</p>
            <p class="score-value">${ nutr.sugars100g ?? 'N/A' } g</p>
            <small>per 100g</small>
          </div>
          <div class="score-card">
            <p class="score-label">Salt</p>
            <p class="score-value">${ nutr.salt100g ?? 'N/A' } g</p>
            <small>per 100g</small>
          </div>
          <div class="score-card">
            <p class="score-label">Protein</p>
            <p class="score-value">${ nutr.protein100g ?? 'N/A' } g</p>
            <small>per 100g</small>
          </div>
        </div>
      </section>

      <section class="panel warning-panel">
        <div class="panel-head">
          <p class="pill-label">Warnings & suitability</p>
          <h4>Flags to review</h4>
        </div>
        <div class="warning-list">
          ${ warningFlags.map( flag => `
            <div class="warning-chip ${ flag.active ? 'warning-chip--alert' : 'warning-chip--ok' } warning-chip--${ flag.tone }">
              <div>
                <p class="warning-title">${ flag.active ? '⚠ ' : '✔ ' }${ flag.label }</p>
                <p class="warning-detail">${ flag.detail }</p>
              </div>
              <span class="status-pill">${ flag.active ? 'Review' : 'Clear' }</span>
            </div>
          ` ).join( '' ) }
          <div class="suitability-row">
            <span class="status-pill">Vegan: ${ flags.vegan ? 'Yes' : 'No / unknown' }</span>
            <span class="status-pill">Vegetarian: ${ flags.vegetarian ? 'Yes' : 'No / unknown' }</span>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <p class="pill-label">Macro view</p>
          <h4>Key nutrients (per 100g)</h4>
        </div>
        <ul class="nutrient-list nutrient-grid">
          <li><span>Energy</span><span>${ nutr.energyKcal100g ?? 'N/A' } kcal</span></li>
          <li><span>Fat</span><span>${ nutr.fat100g ?? 'N/A' } g</span></li>
          <li><span>Saturated fat</span><span>${ nutr.saturatedFat100g ?? 'N/A' } g</span></li>
          <li><span>Carbs</span><span>${ nutr.carbs100g ?? 'N/A' } g</span></li>
          <li><span>Sugars</span><span>${ nutr.sugars100g ?? 'N/A' } g</span></li>
          <li><span>Fiber</span><span>${ nutr.fiber100g ?? 'N/A' } g</span></li>
          <li><span>Protein</span><span>${ nutr.protein100g ?? 'N/A' } g</span></li>
          <li><span>Salt</span><span>${ nutr.salt100g ?? 'N/A' } g</span></li>
        </ul>
      </section>

      <section class="panel">
        <div class="panel-head">
          <p class="pill-label">Ingredients</p>
          <h4>Allergens & label</h4>
        </div>
        <p class="muted">Allergens</p>
        <p>${ allergens.length ? allergens.join( ', ' ) : 'No allergens listed.' }</p>
        <p class="muted">Ingredients</p>
        <p>${ p.ingredientsText || 'No ingredients text available.' }</p>
      </section>

      <section class="panel">
        <div class="panel-head">
          <p class="pill-label">Regulatory data</p>
          <h4>USDA extra data</h4>
        </div>
        ${ usdaNutrients.length
            ? `<ul class="nutrient-list">
                ${ usdaNutrients
                .map( n => `<li>${ n.name }: ${ n.amount } ${ n.unit }</li>` )
                .join( '' ) }
               </ul>`
            : '<p>No extra USDA data available for this product.</p>'
        }
      </section>
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
