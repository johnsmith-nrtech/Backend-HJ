# System Architecture

The platform uses a monolithic, modular backend with NestJS and a Next.js (React) frontend in a single monorepo. All code (API, admin UI, etc.) lives in one repository (e.g. using Nx or Turborepo), which simplifies dependency management and CI/CD. The client (Next.js + ShadCN UI) handles Supabase Auth for sign-up/login, then calls REST API endpoints on the NestJS server. NestJS is organized into feature modules (auth, products, orders, etc.) but runs as one process. The backend connects to a Supabase PostgreSQL database (with Auth and Storage services) and also integrates with external services.

## Key Components

- **Frontend (Next.js + ShadCN UI)**: Renders pages (SSR/SSG or SPA), handles user interactions, manages Supabase Auth sessions entirely on the client, and integrates analytics (GA, FB Pixel) on the page. Uses React (Next.js 15) with Tailwind and ShadCN for fast UI.
- **Backend (NestJS)**: REST API written in NestJS. Modular structure (e.g. modules for users, products, orders, admin, etc.) keeps code organized. All modules share the same NestJS server (monolith). Secure endpoints are protected by JWTs from Supabase and NestJS Guards.
- **Database (Supabase / PostgreSQL)**: A single Postgres instance for all data (users, products, orders, etc.), with Supabase Auth schema for authentication. We extend it with custom tables (e.g. users, products, orders). Triggers in Supabase propagate auth events into our tables [supabase.com](https://supabase.com).
- **Storage (Supabase Storage)**: Media (product images, etc.) are stored in Supabase Storage buckets. For example, a product-images bucket with folders by product ID or a type prefix (main/, gallery/, 360/).
- **Payments**: Stripe and PayPal integration via their SDKs/APIs. The frontend initiates payments (checkout sessions or PayPal orders), and webhooks (`/webhooks/stripe`, `/webhooks/paypal`) on the backend update order status.
- **Messaging**: Integrate with WhatsApp Business API (or a service like Twilio's API) to send order updates, and an email service (e.g. SendGrid) for confirmations. These are triggered after order events (order created, paid, shipped, etc.).
- **Admin Panel**: Part of the frontend (Next.js) behind a role-based guard. Admin users can manage products, categories, and orders. CSV import/export for products uses endpoints like `POST /admin/products/import` and `GET /admin/products/export`.
- **Caching/Performance**: (Optional) Use CDN or caching (e.g. Railway Edge, Redis) for hot data (product catalog pages) to improve performance.

This monolithic approach simplifies development (all code in one repo, one deployment). The NestJS modules communicate internally and share the database. The architecture diagram below (simplified) shows the flow: user → frontend → NestJS API → Supabase (DB/Storage) and external APIs (Stripe/PayPal, WhatsApp, Email). Authentication is handled by Supabase (frontend), so the backend trusts the Supabase JWTs on each request and uses them to enforce access.

## Database Schema

We design a relational schema in Supabase (PostgreSQL) with tables for all entities. Key tables (with brief descriptions) include:

- **users**: User accounts and roles. Columns: id UUID PK (references auth.users), email text, name text, role text (enum: customer,admin,editor), created_at, etc. Populated via a Supabase trigger on sign-up [supabase.com](https://supabase.com). Each record corresponds to an authenticated Supabase user.
- **categories**: Product categories (hierarchical). Columns: id SERIAL PK, name text, slug text, parent_id INT NULL (self-FK to categories.id), description text. Supports nested categories via parent_id.
- **products**: Product catalog entries. Columns: id SERIAL PK, name text, description text, category_id INT (FK → categories), base_price numeric, created_at, etc. A product may have multiple variants and images.
- **product_variants**: Product variants. Columns: id SERIAL PK, product_id INT (FK → products), sku text UNIQUE, price numeric (overrides base price if needed), size text, color text, stock INT, etc. Each variant represents a specific combination (e.g. a specific size/color) and has its own inventory and SKU.
- **product_images**: Images for products. Columns: id SERIAL PK, product_id INT (FK), variant_id INT NULL (FK if image specific to a variant), url text (Supabase Storage path), type text (main, gallery, 360), order INT (for ordering images). Allows multiple images per product/variant.
- **discounts**: Discount definitions. Columns: id SERIAL PK, name text, type text (percent or fixed), value numeric, start_date date, end_date date. These define a discount value.
- **category_discounts**: Link discounts to categories. Columns: discount_id INT (FK → discounts), category_id INT (FK → categories). A join table indicating a discount applies to all products in a category.
- **product_discounts**: Link discounts to products. Columns: discount_id INT (FK → discounts), product_id INT (FK → products).
- **variant_discounts**: Link discounts to variants. Columns: discount_id INT (FK), variant_id INT (FK → product_variants).
- **carts**: Shopping carts (for users/guests). Columns: id SERIAL PK, user_id UUID NULL (FK → users), session_id text NULL (for guest carts, a cookie or token), created_at, updated_at. Each user or guest gets one cart.
- **cart_items**: Line items in a cart. Columns: id SERIAL PK, cart_id INT (FK → carts), product_id INT (FK), variant_id INT (FK), quantity INT.
- **orders**: Customer orders. Columns: id SERIAL PK, user_id UUID NULL (FK → users) (nullable for guest orders, or could create a user after checkout), status text (enum: pending, paid, shipped, delivered, cancelled), total_amount numeric, currency text, created_at, updated_at, and address fields (shipping_address text, billing_address text, etc.) or a JSON column for addresses.
- **order_items**: Line items in an order. Columns: id SERIAL PK, order_id INT (FK → orders), product_id INT (FK), variant_id INT (FK), quantity INT, unit_price numeric, discount_applied numeric (if any).
- **payments**: Payments (tracking receipts). Columns: id SERIAL PK, order_id INT (FK → orders), provider text (stripe or paypal), payment_id text (the ID from Stripe/PayPal), status text, amount numeric, currency text, processed_at timestamp.
- **roles** (optional): If we allow multiple roles per user, a table user_roles(user_id, role) instead of single role in users. But a single role per user suffices here.
- **addresses** (optional): If we support saved addresses, an addresses table (id, user_id, street, city, zip, country, etc.) referenced by orders or user profiles.

Each table has primary keys and foreign keys as indicated. For example, product_variants.product_id FK → products.id, carts.user_id FK → users.id, with ON DELETE SET NULL or CASCADE as needed. The schema should define appropriate indexes (e.g. GIN on products for FTS, B-Tree on FKs).

## Supabase Triggers & Storage Strategy

- **Auth signup trigger**: We use a Supabase database trigger on auth.users to populate our custom users table [supabase.com](https://supabase.com). For example, a trigger function handle_new_user() runs AFTER INSERT on auth.users and inserts (new.id, new.email, new.user_metadata->>'name', 'customer') into users. This ensures every authenticated user has a profile record.
- **Profile update triggers** (optional): If Supabase user updates (email, metadata) occur, additional triggers can sync changes to users.
- **Cascade deletion**: We reference auth.users(id) in users with ON DELETE CASCADE so deleting an auth user cleans up the profile (per Supabase guidance [supabase.com](https://supabase.com)).
- **Product/category changes**: Triggers can enforce data integrity (e.g. cascade deletes of variants/images when a product is deleted). These are handled by DB foreign-key cascades or explicit triggers if needed.
- **Inventory/Order stock trigger** (optional): We could add a trigger to reduce product_variants.stock when an order is confirmed (or verify stock before checkout). Or handle this in transaction logic in the API.
- **Storage (Supabase Storage buckets)**: All product images go into a Supabase Storage bucket (e.g. products). We may organize by products/{product_id}/{type}/{filename} or similar. Since metadata (URLs) is in DB, we store only the path or public URL in product_images.url. Supabase RLS (Row-Level Security) policies and bucket permissions ensure only admin can upload, and public or signed URLs serve images. 360° images can be stored in the same bucket with type = 360.

No code is required here, but the strategy is: rely on Supabase's managed Postgres with triggers, and use its storage for media.

## API Endpoints

We expose a RESTful API (NestJS controllers) with routes per feature. All endpoints require a valid Supabase JWT except public read-only routes. Example endpoints by module:

### Auth/Profile:
- `GET /auth/me` – Returns current user profile (from users table) using the Supabase JWT.
- `PUT /auth/me` – Update user profile (name, etc.).
- (No `/auth/signup` or `/auth/login` needed, as Supabase handles that on frontend.)

### Products/Categories:
- `GET /products` – List products (with pagination, filtering by category, search query). Supports query params ?category=, ?search=, etc.
- `GET /products/:id` – Get product details (including variants and images).
- `GET /categories` – List top-level categories (and optionally nested subcategories).
- `GET /categories/:id` – Get category details (with child categories and/or products).
- Admin (protected): `POST /admin/products` – Create product.
- Admin: `PUT /admin/products/:id` – Update product.
- Admin: `DELETE /admin/products/:id` – Delete product.
- Admin: Similar endpoints for categories (`/admin/categories`).

### Cart:
- `GET /cart` – Get current user's cart and items. (Identified by JWT user_id or guest session.)
- `POST /cart/items` – Add item to cart (body: `{ product_id, variant_id, quantity }`). If no cart exists, create one.
- `PUT /cart/items/:id` – Update cart item quantity.
- `DELETE /cart/items/:id` – Remove an item from the cart.
- (For guest users, include a session_id or cookie; the server can create a cart with user_id=NULL, session_id=<cookie>.)

### Orders/Checkout:
- `POST /orders/checkout` – Create a new order from the cart. Request includes cart items, shipping info, chosen payment method. Server creates orders and order_items (status pending). Returns a payment link or client secret.
- `GET /orders/:id` – Get order details (user can view own orders).
- Admin: `GET /admin/orders` – List all orders.
- Admin: `PUT /admin/orders/:id/status` – Update order status (paid, shipped, etc.).

### Webhooks:
- `POST /webhooks/stripe` – Stripe webhook endpoint for payment success/cancellation. On successful payment, set orders.status = paid and record payment in payments.
- `POST /webhooks/paypal` – PayPal webhook for payment completion. Similarly update order.

### Admin Products Import/Export:
- `POST /admin/products/import` – Receive CSV file of products (and variants) to bulk-create/update. Parses CSV server-side and upserts into DB.
- `GET /admin/products/export` – Generate and return a CSV of current products (for backup or editing).

Other Admin: Similar endpoints for user management (if needed, e.g. `GET /admin/users`, `PUT /admin/users/:id/role` to assign roles), and discount management (`/admin/discounts` CRUD).

All admin endpoints require the user's role to be admin or editor (enforced by NestJS Guards). Non-admin endpoints (product listing, cart, checkout) require at most a logged-in user (or optionally allow unauthenticated for viewing/catalog).

## Role-Based Access Control (RBAC)

We implement RBAC using a role field on the users table (e.g. customer, editor, admin). NestJS guards check the role on each request:

- **Roles and Enforcement**: Secure endpoints (admin panel, order management) are decorated with a `@Roles('admin')` or `@Roles('editor','admin')`. A custom RolesGuard checks the decoded JWT (supabase token) to get the user's sub (auth ID), then looks up users.role in the database. If the role is not permitted, the request is rejected with HTTP 403.
- **Frontend**: After login, the frontend (Next.js) also checks the user's role (from `/auth/me` or from a custom claim). It shows or hides admin UI accordingly. For example, the Admin Dashboard route is only accessible if user.role is admin or editor.
- **Supabase Policies**: If we wanted an extra layer, we could also write Supabase Row-Level Security (RLS) policies to enforce that only certain roles can read/write specific tables, but since the backend enforces roles, RLS can be permissive.

This approach centralizes auth in Supabase and uses the token simply for identity; NestJS handles authorization logic. For example, an admin can create/edit products and process orders, whereas a normal customer cannot.

## Product Search

The product search implementation uses a simple database query with ILIKE pattern matching:

- **Simple Pattern Matching**: Searches use PostgreSQL's ILIKE operator for case-insensitive partial matching on product names and descriptions.
- **Implementation**: The NestJS products endpoint (`GET /products?search=`) queries the database using filters like `name.ilike.%query%` and `description.ilike.%query%`.
- **Low Complexity**: This approach is simple but effective for a basic e-commerce platform, with no need for external services.
- **Frontend Enhancement**: The frontend will fetch and cache product data, enabling client-side filtering and search capabilities for a responsive user experience.

## Sprint 1 Roadmap (Initial Backend & Frontend)

Goals: Set up project foundations, basic product browsing, authentication, and cart.

### Project Setup (Week 1):
- Initialize monorepo (e.g. with Nx or Yarn workspaces) containing apps/frontend (Next.js) and apps/api (NestJS). Configure shared libs if needed.
- Set up Supabase project with Auth and PostgreSQL. Create initial tables (users, products, categories) via migrations or Supabase UI.
- Implement Supabase Auth on frontend (sign-up/login pages using Supabase SDK). Add a trigger in Supabase DB to populate users table on signup [supabase.com](https://supabase.com).
- Scaffold NestJS app, configure JWT Guard to accept Supabase JWTs. Implement `GET /auth/me` to fetch current user from DB.
- Basic role logic: add an admin role manually in DB for testing.

### Product & Category (Week 2):
- Design and apply database schema for categories, products, product_variants, product_images. Populate with sample data.
- Backend: CRUD endpoints for categories and products (admin-protected for create/update). Public `GET /categories` and `GET /products`. Include variant data in product response.
- Frontend:
  - Public product listing page (home or catalog) that fetches `/products`.
  - Category pages: show products by category, fetch via API.
  - Product detail pages: show images, description, variants, "Add to cart" button.
  - Basic UI with ShadCN components. No auth needed for browsing.

### Cart & Guest Flow (Week 3):
- Backend: Implement carts and cart_items tables. Endpoints `GET /cart`, `POST /cart/items`, etc. Distinguish user vs guest by checking auth: if no JWT, create a cart with a session cookie.
- Frontend: Cart page. Allow adding products/variants to cart from product pages. Show cart contents, quantities. Provide "Proceed to Checkout" (no payment yet).
- Guest checkout: allow proceeding without login (we'll collect email/shipping at checkout time).

### Order Placement (Week 4):
- Backend: Implement `POST /orders/checkout`. This creates an order in pending status, deducts inventory, and returns a Stripe (and PayPal) payment intent/client secret.
- Integrate Stripe Checkout or PaymentIntent and PayPal Smart Payment Buttons.
- Webhook endpoints skeleton (`/webhooks/stripe`, `/webhooks/paypal`) to log events. On payment success (in testing) update order to paid.
- Frontend: Checkout page to enter shipping info and choose payment. Redirect to confirmation page after "payment" (simulate or test with Stripe test keys).
- Order confirmation page shows order ID and status (pending). Basic order history page `GET /orders` for logged-in users (initial listing).


