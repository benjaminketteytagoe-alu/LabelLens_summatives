# LabelLens Summative – Food Label & Nutrition Explorer

LabelLens is a full-stack JavaScript project that helps users explore food products, labels, and nutrition data using real-world open APIs.  

The backend is built with **Node.js + Express**, serves a REST API, and also serves a static frontend.  
For deployment, the project uses a **3-server architecture**:

- `web01` – Node/Express app (backend + static frontend) on port `3000`
- `web02` – Node/Express app (backend + static frontend) on port `3000`
- `lb01` – Nginx **load balancer + SSL terminator** (ports `80` and `443`)

In addition, development and deployment work were supported by **ChatGPT** (AI pair programmer) and **Cursor** (AI-assisted IDE).

---

## 1. Project Structure

```text
LabelLens_summatives/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── routes/
│   │   ├── products.js        # Product & nutrition endpoints (Open Food Facts, USDA FDC)
│   │   ├── meta.js            # Metadata endpoints (countries, etc.)
│   │   └── auth.js            # Authentication endpoints (basic)
│   ├── services/
│   │   └── geo.js             # Country metadata service (REST Countries API)
│   ├── package.json           # Backend dependencies & scripts
│   └── .env                   # Backend environment variables (NOT committed)
└── frontend/
    ├── index.html             # UI entry point
    └── ...                    # Supporting JS/CSS/assets
````

The backend serves the `frontend/` directory as static files, so both the UI and API are exposed from the same origin.

---

## 2. Main Features

* **Food product lookups** using external open data APIs.
* **Country metadata** for forms and dropdowns.
* **REST API** for the frontend (and external clients) to interact with the data.
* **3-server deployment**:

  * web01 + web02: identical Node/Express app instances
  * lb01: Nginx load balancer with SSL termination
* **Basic protection & robustness**:

  * Simple in-memory rate limiting in the Express app.
  * Light security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
  * Graceful handling of external API failures (degrade instead of crash).

---

## 3. Technologies & Tools

### Backend

* [Node.js](https://nodejs.org/)
* [Express](https://expressjs.com/)
* [Axios](https://axios-http.com/)
* [CORS](https://www.npmjs.com/package/cors)
* [dotenv](https://github.com/motdotla/dotenv)
* [nodemon](https://github.com/remy/nodemon) (dev only)

### Frontend

* Vanilla **HTML/CSS/JavaScript** served statically by Express.

### External APIs

* **Open Food Facts** – open food product database

  * Base: `https://world.openfoodfacts.net`
* **USDA FoodData Central (FDC)** – nutritional data

  * Base: `https://api.nal.usda.gov/fdc/v1`
  * Requires an API key stored in `.env`.
* **REST Countries API** – country metadata

  * Example used: `https://restcountries.com/v3.1/all?fields=cca2,name,region`

> All API keys are kept in `.env` and must **never** be committed to version control.

### Dev & Infrastructure

* **Nginx** – reverse proxy + load balancer + SSL terminator
* **OpenSSL** – for generating a self-signed TLS certificate
* **SSH / scp** – for deploying to remote servers and port-forwarding
* **WSL & Windows PowerShell** – local development and remote management
* **ChatGPT (OpenAI)** – AI assistance for architecture decisions, debugging, and documentation
* **Cursor** – AI-powered IDE for refactoring and iterating on the codebase quickly

---

## 4. Environment Configuration

All sensitive values live in `backend/.env`:
> The `.env` file is intentionally **ignored** by Git and must be created on each environment (local, web01, web02).

---

## 5. Running the Project Locally

### 5.1 Prerequisites

* Node.js (v18+ recommended; v20 LTS used in deployment)
* npm (comes with Node)
* Optional: USDA API key if you want full nutrition functionality

### 5.2 Steps

1. **Clone or open the project**

   ```bash
   cd LabelLens_summatives
   ```

2. **Configure environment**

   ```bash
   cd backend
   cp .env.example .env   # if you have one, otherwise create .env manually
   # Edit .env to add your API keys and base URLs
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Run the backend locally**

   ```bash
   npm run dev    # or: npm run start
   ```

   You should see:

   ```text
   LabelLens backend listening on port 3000
   ```

5. **Access the app**

   * Health check:
     `http://localhost:3000/api/health`
   * UI:
     `http://localhost:3000`

---

## 6. API Overview (Backend)

### 6.1 Health Check

* **GET** `/api/health`

```json
{
  "status": "ok",
  "app": "LabelLens backend"
}
```

### 6.2 Metadata – Countries

* **GET** `/api/meta/countries`

Returns a list of countries (backed by REST Countries API):

```json
[
  { "code": "RW", "name": "Rwanda", "region": "Africa" },
  { "code": "GH", "name": "Ghana", "region": "Africa" }
  // ...
]
```

### 6.3 Products & Nutrition

* **Base path:** `/api/products/...`

Uses Open Food Facts and USDA FoodData Central for product and nutrient data.
Exact queries and parameters are implemented in `backend/routes/products.js`.

### 6.4 Authentication

* **Base path:** `/api/auth/...`

Contains basic auth endpoints (see `backend/routes/auth.js`).

---

## 7. Multi-Server Deployment (web01, web02, lb01)

### 7.1 Architecture

* **web01** (`34.239.108.185`)
* **web02** (`3.83.215.12`)

  * Both run the Node/Express app on `PORT=3000`.
  * Both serve the same codebase and the `frontend/` statics.
* **lb01** (`44.202.141.158`)

  * Runs Nginx
  * Acts as reverse proxy + load balancer
  * Terminates SSL and forwards traffic to web01 & web02 over HTTP.

### 7.2 Deploying to web01 & web02

> The commands below assume Ubuntu 20.04 and SSH access as `ubuntu`.

#### 1. Install Node 20 and npm

On **each** web server:

```bash
sudo apt update
sudo apt remove -y nodejs        # remove old Node if installed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

#### 2. Copy the project to the server (from your laptop)

From **PowerShell on your laptop**:

```powershell
cd F:\lablelens\LabelLens_summatives
scp -i $HOME\.ssh\id_rsa -r . ubuntu@34.239.108.185:~/LabelLens_summatives
scp -i $HOME\.ssh\id_rsa -r . ubuntu@3.83.215.12:~/LabelLens_summatives
```

#### 3. Install and run the app on each web server

On **web01**:

```bash
ssh -i ~/.ssh/id_rsa ubuntu@34.239.108.185

cd ~/LabelLens_summatives/backend
cp .env.example .env  # or create .env and add API keys
npm install
npm run start         # or: node server.js
```

In a second SSH session:

```bash
curl http://localhost:3000/api/health
```

Repeat the same steps on **web02**.

---

### 7.3 Configure Nginx on lb01 (HTTP load balancer)

On **lb01**:

```bash
sudo apt update
sudo apt install -y nginx nano
```

Create the site config:

```bash
sudo nano /etc/nginx/sites-available/labellens.conf
```

Content:

```nginx
upstream labellens_backend {
    server 34.239.108.185:3000;
    server 3.83.215.12:3000;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass         http://labellens_backend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/labellens.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Test on lb01:

```bash
curl http://localhost/api/health
# should return {"status":"ok","app":"LabelLens backend"}
```

---

### 7.4 Add SSL (self-signed) on lb01

Because the `.tech` domain is currently not working, SSL is implemented using a **self-signed certificate** on the load balancer. This encrypts the traffic but will show a browser warning (which is acceptable for a lab/summative environment).

#### 1. Create a self-signed certificate

On **lb01**:

```bash
sudo mkdir -p /etc/nginx/ssl
cd /etc/nginx/ssl

sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout labellens.key \
  -out labellens.crt \
  -subj "/C=RW/ST=Kigali/L=Kigali/O=LabelLens/OU=Summative/CN=44.202.141.158"
```

#### 2. Update Nginx config to use HTTPS + redirect HTTP → HTTPS

```bash
sudo nano /etc/nginx/sites-available/labellens.conf
```

Replace contents with:

```nginx
upstream labellens_backend {
    server 34.239.108.185:3000;
    server 3.83.215.12:3000;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name _;

    return 301 https://$host$request_uri;
}

# HTTPS with self-signed certificate
server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/labellens.crt;
    ssl_certificate_key /etc/nginx/ssl/labellens.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass         http://labellens_backend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
    }
}
```

Test & reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. Test HTTPS

On **lb01**:

```bash
curl -k https://localhost/api/health
```

On **your laptop** (if IP is accessible):

```powershell
curl -k https://44.202.141.158/api/health
```

Browser:

* `https://44.202.141.158`
* Accept the self-signed certificate warning → app loads via HTTPS.

#### 4. If servers are intranet-only: use SSH tunneling

From your laptop:

```powershell
ssh -i $HOME\.ssh\id_rsa -L 8443:127.0.0.1:443 ubuntu@44.202.141.158
```

Then in the browser:

```text
https://localhost:8443
```

Accept the self-signed cert warning → app is now accessible over encrypted HTTPS via the tunnel.

---

## 8. Challenges & How They Were Solved

1. **Node.js version mismatch (`node:events` module error)**

   * Error occurred when using the old Ubuntu `nodejs` package.
   * **Solution:** Removed the old Node, installed **Node 20 LTS** via NodeSource, then re-installed dependencies.

2. **Empty `/api/meta/countries` response / country API issues**

   * Initially attempted to use GeoDB via RapidAPI, which required correct keys and subscription.
   * To simplify and avoid failure in a summative environment, switched to **REST Countries API** in `services/geo.js` and mapped results to a consistent `{ code, name, region }` format.

3. **Intranet vs local access**

   * Remote servers (web01, web02, lb01) were sometimes only reachable inside a specific network.
   * **Solution:** Used SSH key-based access and port forwarding. Exposed lb01 locally via:

     * `ssh -L 8080:127.0.0.1:80 ...` for HTTP
     * `ssh -L 8443:127.0.0.1:443 ...` for HTTPS

4. **SSH key permissions and confusion between Windows and WSL paths**

   * Initial errors: "UNPROTECTED PRIVATE KEY FILE" and missing identity files when mixing Windows and WSL paths.
   * **Solution:**

     * Fixed permissions (`chmod 600 id_rsa` on WSL; `icacls` on Windows).
     * Standardized on `~/.ssh/id_rsa` and `$HOME\.ssh\id_rsa` for SSH.
     * Ensured `scp` is run from **the laptop** when copying from local drives.

5. **Minimal Ubuntu image (missing `nano`, etc.)**

   * `nano` not found when editing Nginx config on lb01.
   * **Solution:** Installed `nano` via `sudo apt install -y nano` before editing configuration files.

6. **Domain issues with `.tech` domain**

   * Planned to use a custom `.tech` domain with Let’s Encrypt, but DNS/domain setup was not fully working.
   * **Solution:** Implemented SSL using a **self-signed certificate** on lb01 based on the IP address. This is acceptable for labs; production would move to Let’s Encrypt once DNS is stable.

---

## 9. Recommendations & Reflections on Tools

### APIs & Infrastructure

* **Open Food Facts**
  Great for open product datasets. Recommended for educational and non-commercial experimentation. Be mindful of rate limits and keep caching in mind for real production use.

* **USDA FoodData Central**
  Professional-grade nutrient data. Requires careful handling of API keys and requests. Recommended for serious nutrition analysis.

* **REST Countries API**
  Simple and reliable for country metadata. Ideal for dropdowns and forms.

* **Node.js + Express**
  Fast to get started, excellent ecosystem. For production, add:

  * Process manager (e.g. `pm2`)
  * Structured logging (e.g. `winston`)
  * Better error monitoring.

* **Nginx**
  Very powerful as an HTTP reverse proxy and SSL terminator. Recommended for:

  * Load balancing multiple app servers
  * Handling SSL centrally (especially in microservice or multi-instance setups)
  * Static asset caching and Gzip configuration.

### Developer Tools

* **Cursor**
  Used as the main IDE with AI integration:

  * Helped quickly refactor code and navigate the codebase.
  * Great for iterating on server.js, routes, and deployment scripts.

* **ChatGPT (OpenAI)**
  Used heavily as an AI pair-programmer and documentation assistant:

  * Helped reason through SSH / Nginx / SSL configuration.
  * Assisted with debugging tricky errors (e.g. Node version issues, tunneling, and multi-server wiring).
  * Supported writing this README and breaking complex steps into clear instructions.

> Recommendation: For future work, continue combining **Cursor + ChatGPT** for rapid iteration, but always validate and test the configuration in a real environment (especially when dealing with firewalls, DNS, and production SSL).

---

## 10. Author & Credits

* **Author:** Benjamin Kettey-Tagoe

  * Role: Full-stack developer (backend, integration, deployment, documentation)
  * Focus: Clean API design, realistic multi-server architecture, and thorough documentation.

### Special Thanks

* **API Providers & Maintainers**

  * Open Food Facts community
  * USDA FoodData Central team
  * REST Countries API maintainers

* **Tooling**

  * Node.js, Express, Axios, Nginx, OpenSSL
  * WSL, Windows PowerShell
  * Cursor IDE
  * ChatGPT (OpenAI)

---

## 11. License – MIT

This project is licensed under the **MIT License**.

```text
MIT License

Copyright (c) 2025 Benjamin Kettey-Tagoe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
