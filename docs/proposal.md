# Sofa Deal E-Commerce System Proposal

**Executive Summary:** The Sofa Deal online store will be rebuilt as a modern web platform (Next.js frontend, NestJS backend, and Supabase for database/auth/storage) to support international growth. The system will deliver a fast, mobile-friendly shopping experience with features like typo-tolerant search, unique SKU generation, interactive 360° product views, secure payment checkout (Stripe and PayPal, PCI-DSS compliant), fraud detection, analytics integrations, and automated order notifications (email and WhatsApp Business API).  We will leverage cloud services and agile practices to build a **secure, scalable, and cost-efficient** solution in a 2-month timeline. Key highlights include: faster page loads and SEO (via Next.js SSR/SSG), robust TypeScript-based backend (NestJS), and managed Postgres/Auth/Storage via Supabase.

**Figure:** Expanding Sofa Deal internationally with a modern web platform. This proposal outlines how each business and technical requirement will be met.

## Business and Technical Objectives

* **Business Goals:** Enable Sofa Deal to expand into new markets with a **globalized storefront** (multi-language/currency support) and improved customer experience. The platform should boost conversion through fast, reliable shopping and personalized order notifications. We will integrate analytics (Google Analytics, Facebook Pixel, Search Console) to monitor growth and optimize marketing. Quick time-to-market (2 months) and a lean budget are critical.
* **Technical Goals:** Deliver a **mobile-first, SEO-friendly** website using Next.js (supports static generation and server rendering for optimal SEO). Use NestJS (a scalable, TypeScript-based Node framework) for the API to ensure well-structured, testable code. Supabase will handle the Postgres database, authentication and file storage, providing auto-generated APIs and built-in security (Row Level Security policies). We prioritize security (HTTPS, OWASP practices, PCI-DSS compliance via Stripe Elements), scalability (cloud hosting and CDN), and extensibility (clear modular architecture).

**Key objectives include:**

* Deliver a **fast, responsive shopping site**.
* Implement **smart search** with fuzzy/typo tolerance and filters.
* Ensure **security and compliance**: card data bypass (tokenized via Stripe/PayPal), fraud detection (Stripe Radar), and protected user data (Supabase Auth, RLS).
* Support **high data throughput** and concurrent users (load-balanced hosting, caching).
* Provide **management tools**: bulk CSV import/export, role-based access (admin/staff/customer).
* Integrate **analytics and notifications** for business insights and customer engagement (Google Analytics, Facebook Pixel, Search Console, email and WhatsApp Business API).

## System Architecture and Tech Stack

The proposed architecture uses a **Jamstack-inspired** design with a decoupled frontend and backend:

* **Frontend (Next.js):** A React-based Next.js app will serve pages using Static Site Generation (SSG) and Server-Side Rendering (SSR) for SEO and performance. Internationalization is supported via Next.js i18n routing (configurable `locales` in `next.config.js`). Images and assets (e.g. 360° image galleries) will be stored in Supabase and served via CDN.
* **Backend (NestJS API):** A NestJS service will expose RESTful APIs for business logic (product management, order processing, search indexing, etc.). NestJS is chosen for its structured, scalable design and TypeScript support. It can run on Node.js behind a load balancer. Payment webhooks (Stripe, PayPal) and messaging (email, WhatsApp Business API) will be handled server-side. Unique SKU generation can be implemented in an API endpoint (e.g. UUIDs or custom alphanumeric scheme ensuring uniqueness).
* **Supabase (Auth, Database, Storage):** Each Supabase project includes a full **Postgres database** with built-in Auth. We will use Supabase Auth for user login/signup (email, social logins), and enforce data access with Row Level Security (RLS) policies. Supabase auto-generates REST and GraphQL APIs for the database, speeding development. Product images, including the 360° shots, and user content will be stored in Supabase Storage (S3-compatible, CDN-backed). Real-time features (e.g. inventory stock updates) can use Supabase real-time streams if needed.

**Figure:** Next.js frontend and NestJS backend on cloud hosting, with Supabase (Postgres, Auth, Storage) as the data backbone. Third-party services (Stripe/PayPal, WhatsApp Business API, Analytics) are integrated via secure APIs.

* **Third-party Integrations:**

  * **Search Engine:** We will integrate a dedicated search service (see *Alternatives* section). The product catalog will be indexed for fast, typo-tolerant search.
  * **Payments:** Stripe and PayPal will be integrated for checkout. We will use Stripe Elements or Checkout to collect payment details—this ensures card data is sent directly to Stripe's PCI-validated servers. A separate "payments" microflow/page will handle redirection, avoiding any storage of raw card data.
  * **Security:** Leverage HTTPS, Helmet.js (NestJS) and rate limiting. All API endpoints requiring auth will check JWTs issued by Supabase Auth.
  * **Notifications:** Use email and WhatsApp Business API to send order confirmations. Email notifications can be implemented via third-party services (e.g., SendGrid, Mailgun) or through Supabase functions. WhatsApp Business API will enable direct communication with customers for order updates.

**Stack Summary:** Next.js (React), NestJS (Node/TypeScript API), Supabase (Postgres DB, Auth, Storage). Deployed on Railway cloud hosting. This stack allows fast development and easy scaling. Supabase's managed services and Railway hosting minimize operations overhead and cost.

## Frontend and Backend Feature Breakdown

* **Product Catalog & Search:**

  * **Frontend:** Display product listings, filter by category/price/etc, and show 360° spin (custom viewer using provided images). 360° view can be implemented with a lightweight library (e.g. [Photo Sphere Viewer](https://photo-sphere-viewer.js.org/) or Three.js), rotating between the 3–4 client-provided shots for each product.
  * **Backend:** Store products in Postgres. On product upload, generate a unique SKU (e.g. prefix plus random alphanumeric code) to ensure non-sequential, non-guessable IDs. Index products in the chosen search engine for instant, fuzzy search.

* **Authentication & Roles:**

  * **Auth:** Use Supabase Auth for email/password and social login. Frontend will protect routes (Next.js middleware) by checking user sessions.
  * **Roles:** Three roles (Admin, Staff, Customer) enforced via RLS or NestJS guards. Admins can manage all data, staff limited to operations like order updates, customers see only their own orders. Supabase RLS policies will ensure customers only access their own records.

* **Checkout & Payments:**

  * **Frontend:** A multi-step checkout (cart → address/payment → confirmation). When "Pay" is clicked, either open Stripe Checkout or PayPal's flow.
  * **Backend:** Receive payment webhooks: verify transaction, create order records. Use Stripe Radar for fraud checks. Flag or cancel orders on suspicious activity. Do **not** store raw card details—only tokens/IDs from Stripe/PayPal. Provide separate hosted payment page (or iframe) so sensitive entry is off our servers.

* **Order Processing & Notifications:**

  * **Backend:** Upon successful payment, update order status. Send email confirmations via a dedicated email service (SendGrid, Mailgun) or Supabase functions. Integrate with WhatsApp Business API to send order status updates directly to customers' WhatsApp.
  * **Admin Panel:** Secure dashboard (Next.js page or separate SPA) for staff to view orders, manage products (with CSV bulk import/export), and handle customer inquiries. Use Supabase's auto-REST for ease of integration.

* **Performance & Analytics:**

  * Lazy-load images, use Next.js image optimization for product photos. Pre-render product pages where possible (SSG) for SEO.
  * Insert Google Analytics, Facebook Pixel scripts, and register site with Google Search Console for tracking traffic and marketing ROI. Track events (add-to-cart, purchases) for analysis.

## Alternatives for Key Components

We have evaluated different technologies where applicable:

* **Search:** We compare **Algolia (SaaS)** vs **Meilisearch (open-source)** (also mention Typesense as similar open-source):

  | Aspect             | Algolia (SaaS)                      | Meilisearch (Self-hosted)                       |
  | ------------------ | ----------------------------------- | ----------------------------------------------- |
  | Source             | Proprietary, closed-source          | Open-source (MIT)                               |
  | Hosting/Deployment | Hosted by Algolia (global CDN)      | Self-hosted (runs on our server)                |
  | High Availability  | Built-in multi-node cloud (CDN)     | Single-node by default – no built-in clustering |
  | Typo tolerance     | Advanced built-in (fault tolerance) | Built-in typo search (configurable)             |
  | Cost               | Usage-based (free tier then pay)    | Free to use (only infra cost)                   |

  *Recommendation:* **Algolia** is mature and fully-managed (no maintenance) but incurs fees. **Meilisearch** is lightweight and cost-free but requires setting up and managing infrastructure; it currently lacks built-in high-availability (single point of failure). As a compromise, one could start with Meilisearch for cost-savings and later migrate to Algolia if needed. (Typesense is another open alternative with clustering support.) For a 2-month project with limited ops, Algolia is easier, but Meilisearch may be acceptable if budget is tight. We'll decide with the client's preference.

* **Payments:** The system will integrate both **Stripe** and **PayPal**:

  * *Stripe:* Modern developer-centric API, supports global currencies, many payment methods, and has advanced fraud tools (Stripe Radar). Stripe's fees are generally lower than PayPal's for most merchants.
  * *PayPal:* Widely recognized by customers, easy for one-click PayPal logins. Integration is simple for standard checkout flows, but offers less customization.

  | Feature          | Stripe                                           | PayPal                                            |
  | ---------------- | ------------------------------------------------ | ------------------------------------------------- |
  | API/Integration  | Robust REST APIs, requires developer work        | SDKs and simple buttons, minimal coding           |
  | Compliance       | PCI-compliant with Checkout/Elements (tokenized) | PCI-compliant for PayPal JS (less control)        |
  | Fees             | Lower on average                                 | Slightly higher, especially for microtransactions |
  | Fraud Protection | Stripe Radar (machine learning)                  | Basic risk filters or maxmind                     |
  | Global support   | 135+ currencies, 40+ countries                   | 100+ countries, many local wallets                |

  *Recommendation:* Use **both**. Stripe as primary gateway for credit cards (with Radar for fraud), and also offer PayPal Express Checkout. Both comply with PCI by offloading card data (Stripe Elements, PayPal's JS SDK).

* **Cloud Hosting:**

  * **Frontend (Next.js):** Host on Railway or other Node.js-compatible platforms for auto-deployment from our code repo. Railway optimizes Node.js builds and provides CDN distribution of static assets (fast global caching).
  * **Backend (NestJS API):** Options include Heroku (easy deploy with Node buildpack), AWS Fargate/ECS, DigitalOcean App Platform, or Railway. We recommend a PaaS with autoscaling (e.g. Heroku or AWS Elastic Beanstalk) to meet the 2-month launch target and then scale as traffic grows.
  * **Database/Services:** Supabase is fully managed, so we only pay for usage (it abstracts away servers). If needed, we could also host a self-managed Postgres, but Supabase saves significant effort.

* **Messaging:** We will use **email services** (like SendGrid or Mailgun) for confirmations and the **WhatsApp Business API** for direct customer communication. The WhatsApp Business API allows automated messaging at scale and is officially supported by Meta, ensuring reliable delivery to global customers. Email services provide delivery tracking and templating capabilities for professional communications.

## Complexity & Risk Assessment

**Technical Risks:**

* **Scope Creep / Timeline:**  Many features (search, payments, analytics, 360° viewer) in 2 months. *Mitigation:* Adopt an agile approach with iterative sprints. Prioritize an MVP with core flows (browsing → checkout) and integrate extras (CSV import, advanced search options) in later releases. Use pre-built libraries to accelerate development.
* **Payment Integration & Compliance:** Handling card data demands PCI-DSS compliance. *Mitigation:* Use Stripe Checkout/Elements and PayPal SDK so that card data never touches our servers. We implement a separate payment tab/flow and do not store any card details. We will follow Stripe's PCI guide closely.
* **Search Implementation:** Achieving robust typo-tolerance and fast search is complex. *Mitigation:* Evaluate and prototype both Algolia and Meilisearch early. Use open-source (Meili) first if budget constrained, but plan fallback to Algolia if performance or reliability issues arise. Our timeline allows prototype with Meilisearch (it's quick to set up).
* **360° Product View:** Combining multiple images for a smooth spin requires a tested library. *Mitigation:* Use an existing JavaScript 360-viewer. Ensure images from client are consistent and test on devices.

**Project Risks:**

* **Third-party Dependencies:** We rely on external services (Supabase, Stripe, WhatsApp Business API). Outages or API changes could block features. *Mitigation:* Code with retry/fallback logic and use generic error handling.
* **Team Skills:** New stack elements (if unfamiliar) could slow dev. *Mitigation:* Assign tasks to developers based on expertise (e.g. someone experienced with React/Next handles frontend, someone strong in Node handles NestJS). Use training time or small spikes for unknown tech (e.g. Supabase tutorials).
* **Data Migration:** If migrating existing product data, CSV import/export must be bulletproof. *Mitigation:* Create schema first, run test imports, validate data.

Overall, the architecture minimizes custom complex infra by leveraging managed services (Supabase, Railway, Stripe) so we can focus on business logic. Iterative testing and code reviews will catch issues early. Regular stakeholder demos will keep scope aligned.

## Deployment Strategy and Hosting

* **Environment Setup:** We will have at least three environments: *Development*, *Staging*, and *Production*. Developers will deploy feature branches to Dev, merge to main triggers Staging (auto-deployed to a QA domain), and final code goes to Prod.
* **CI/CD:** Use GitHub Actions for continuous deployment to Railway. Running lint/tests on each PR. Migrations (DB schema) version-controlled and applied automatically.
* **Frontend Hosting:** Railway is used for both frontend and backend hosting, providing a unified deployment experience with auto-scaling capabilities.
* **Backend Hosting:** A Node-friendly PaaS (Heroku, Render.com, Railway) can host the NestJS API. We will containerize via Docker if needed. Auto-scaling (workers/processes) will accommodate traffic spikes.
* **Database/Storage:** Supabase is cloud-hosted; no setup needed beyond configuring tables and buckets. Its usage-based pricing is cost-effective for startups.
* **CDN & Caching:** Enable global CDN through Railway's infrastructure and Supabase Storage uses Cloudflare. Use HTTP caching headers for static assets and product pages. For dynamic API, we can use in-memory caching (Redis or NestJS cache) if needed, but Postgres can handle moderate load.
* **Monitoring:** Set up uptime monitoring and logging (Supabase has basic logs, and we can use Sentry or LogRocket). Configure Google Analytics for traffic and conversion metrics.

This setup ensures minimal ops overhead and elastic scaling. Using managed services (Railway, Supabase, Stripe) keeps costs predictable and matches the "cost-efficient" requirement.

## Internationalization

**Internationalization (i18n):** To serve a global audience, we will enable multi-language and multi-currency:

* **Languages:** Next.js has built-in i18n routing. We will configure supported locales (e.g. `en`, `fr`, `de`, etc.) in `next.config.js`. Content (UI text, and possibly product descriptions) will be translated and served under locale-specific paths or domains. We'll use a React i18n library (like `react-intl` or `next-intl`) for runtime translation. SEO is preserved via `<html lang="...">` tags and separate URLs.
* **Currencies:** Prices will be stored in a base currency (e.g. USD) and converted on the fly using a currency API or by maintaining exchange rates. The frontend will format prices according to the locale and currency.
* **Time Zones/Formats:** Dates and numbers will be formatted per user locale.

International SEO: We will configure hreflang tags so search engines index region-specific pages correctly. The site's metadata (titles, descriptions) will be localized. As noted, Next.js i18n routing automatically handles alternate links.

By supporting multiple locales out-of-the-box, Sofa Deal can expand to new regions quickly without separate codebases. Next.js's i18n routing makes this straightforward, ensuring each locale serves correct content without slowing global performance.

---

*All technical decisions are guided by current best practices and documentation. For example, NestJS is explicitly designed "for building efficient, scalable Node.js server-side applications" (using TypeScript for robustness), and Supabase provides managed Postgres with auto-APIs to speed development. Stripe Radar uses machine learning on global payment data to block fraud, and integrating email and WhatsApp Business API for order notifications aligns with standard e-commerce communication. We will leverage these mature solutions to meet Sofa Deal's goals quickly and reliably.*

**Sources:** Architecture and tech details are based on official docs and industry guides (Next.js, NestJS, Supabase, Stripe) as cited above. All solution components have been chosen for rapid development, ease of maintenance, and scalability.