# Project Context & Architecture Knowledge Base: Francys Backend

> **Note for AI Assistants & Developers**: This document contains the complete architectural, domain, schema, and workflow knowledge of the **Francys (MAK SERVI)** backend. It is automatically referenced to provide instant context without having to inspect commit history or reverse-engineer data models on every session.

---

## 1. Project Overview & Business Domain

**Francys (MAK SERVI)** is a specialized **ERP, CRM, and Shop Management backend** designed for custom apparel, screen printing, embroidery, and promotional goods businesses (comparable to _Printavo_).

### Primary Capabilities

- **Product Catalog & Supplier Integration**: Manages garments, styles, colors, sizes, and directly syncs wholesale apparel catalogs from **SanMar** via SFTP (CSV/ZIP) and SOAP web services.
- **Dynamic Quoting Engine**: Multi-group quotes with dynamic garment size breakdowns, garment markups, and tiered print pricing matrices.
- **Customer Self-Service Portal**: Public quote endpoints (`/api/v1/quotes/public/:id`) allowing customers to view, approve, request revisions, or decline quotes without logging in.
- **Production Job Board**: Automated job creation upon quote approval with an 8-stage production Kanban pipeline and mandatory audit trail notes.
- **Invoicing & Stripe Installments**: Automated invoice generation from quotes, supporting partial payments (e.g., 50% deposit upfront, balance on completion) powered by Stripe Invoices & Webhooks.
- **Omnichannel Communication**: Two-way WhatsApp messaging via Meta Graph API, Gmail tracking with automated thread sync, and bulk promotional email campaigns via Handlebars templates.
- **Business Intelligence**: Dedicated Dashboard and Reports/Analytics endpoints tracking revenue trends, job velocity, conversion rates, and unpaid invoice metrics.

---

## 2. Technology Stack & Infrastructure

| Layer                   | Technology                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**           | [NestJS 11](https://nestjs.com/) (TypeScript, Express platform, `rawBody: true` for Stripe webhooks)                                                                  |
| **ORM & Database**      | [Prisma 7.8](https://www.prisma.io/) with **multi-file schema partitioning** (`prisma/schema/*.prisma`) running on PostgreSQL (Local & [Neon DB](https://neon.tech/)) |
| **Documentation**       | Swagger / OpenAPI 3.0 at `/api/v1/docs` (`@nestjs/swagger`)                                                                                                           |
| **Payments**            | Stripe API (`stripe` v22.3) with Invoice finalization & Webhook event verification                                                                                    |
| **Supplier APIs**       | SanMar SFTP (`ssh2-sftp-client`, streaming `csv-parse`) & PromoStandards SOAP (`soap`)                                                                                |
| **Messaging**           | Meta Cloud API (WhatsApp Business Graph API), Nodemailer with Handlebars templates (`@nestjs-modules/mailer`), Googleapis (Gmail sync)                                |
| **Cloud Storage**       | Cloudinary (product imagery, shop logos, mockup uploads)                                                                                                              |
| **Scheduling**          | `@nestjs/schedule` (Cron jobs for email sync and automated checks)                                                                                                    |
| **DevOps & Containers** | Docker multi-stage build, `docker-compose` (API on port 3000, PostgreSQL on port 5433 host / 5432 container, pgAdmin on port 5050)                                    |
| **CI/CD**               | GitHub Actions deploying to production Linux VPS at `/opt/franchys` via SSH                                                                                           |

---

## 3. Git Branches & Workflow Conventions

- **`shuvo-dev`**: Active feature development and consolidation branch (maintained by Shahid Hasan Shovu). Contains full Phase 1–5 features, testing suites, and latest code hygiene.
- **`main` (`origin/main`)**: Production release branch. Automated deployments to the VPS trigger on pushes to `main`.
- **`dev` (`origin/dev`)**: Core integration branch where PRs are reviewed before landing in `main`.
- **`robiul` (`origin/robiul`)**: Feature branch (by Robiul Hasan) historically used for SanMar catalog sync, WhatsApp, Stripe payments, and line item customization.

---

## 4. Database Schema Structure (`prisma/schema/`)

Prisma uses multi-file schema management. The files are located in `prisma/schema/`:

| Schema File                        | Core Models & Purpose                                                                                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.prisma`                      | Datasource, client config, and global Enums (`Role`, `Status`, `AdminRole`, `VendorStatus`).                                                                                                                                                                    |
| `user.prisma`                      | `User` (Authentication, roles, profile, avatar) and `UserPermission` (granular boolean permissions for customers, quotes, jobs, products, invoices, fees, shop info, vendors).                                                                                  |
| `customer.prisma`                  | `Customer` (`BUSINESS` vs `PERSONAL` customer types, tax IDs, contact details, tags, Stripe customer ID, soft-delete).                                                                                                                                          |
| `quote.prisma`                     | `Quote` (`quoteNumber` like `Q-1001`, status `DRAFT`, `SENT`, `APPROVED`, `REVISION_REQUESTED`, `DECLINED`, financial totals) and `QuoteLineItem` (`sizeBreakdown` JSONB, `baseCost`, `markupPrice`, `matrixId`, `printCost`, `unitPrice`, `total`, `mockups`). |
| `jobs.prisma`                      | `Job` (production card linked to `Quote`, `jobId`, `amount`, `dueDate`) and `JobStatusHistory` (records status transitions with required notes and author).                                                                                                     |
| `customer-invoice.prisma`          | `CustomerInvoice` (`invoiceNumber` like `INV-1001`, Stripe invoice IDs, amount paid/due), `InvoiceLineItem`, `InvoiceInstallment` (deposit vs balance installments), and `Payment` (Stripe charge audit log).                                                   |
| `payment-term.prisma`              | `PaymentTerm` (`depositPercent`, `paymentDaysAllowed`, `dueDateStrategy`: `FROM_INVOICE_DATE` or `FROM_PREVIOUS_PAID`).                                                                                                                                         |
| `price.matrics.prisma`             | `PriceMatrix` and `PriceTier` (tiered volume discounting: `quantity`, `basePrice`, `markup`).                                                                                                                                                                   |
| `product.prisma`                   | `Product` (`productName`, `itemNo`, `price`, `availableSizes`, `images`) and `ProductColor` (batch variants).                                                                                                                                                   |
| `brand.prisma` & `category.prisma` | Product categorization and branding with soft-delete support.                                                                                                                                                                                                   |
| `line-item-customization.prisma`   | UI column visibility toggles and sizing configuration presets (Adult, Youth, Toddler, Infant).                                                                                                                                                                  |
| `whatsapp-tracking.prisma`         | `WhatsAppContact`, `WhatsAppConversation`, and `WhatsAppMessage` (Meta webhook storage).                                                                                                                                                                        |
| `email-tracking.prisma`            | `Contact`, `Thread`, and `Message` (two-way email tracking and sync).                                                                                                                                                                                           |
| `campaign.prisma`                  | `Campaign` (Promotional email campaigns, promo codes, discount validations).                                                                                                                                                                                    |
| `shop.information.prisma`          | `ShopInformation` (company branding, logo, contact, timezone).                                                                                                                                                                                                  |
| `invoice.information.prisma`       | `InvoiceInformation` (`invoiceSeed`, default tax rate, payment instructions).                                                                                                                                                                                   |
| `invoice.fees.prisma`              | Optional configurable invoice line fee surcharges.                                                                                                                                                                                                              |
| `vendors.prisma`                   | `Vendor` directory with active/inactive status and contact info.                                                                                                                                                                                                |
| `quote-delivery-log.prisma`        | Delivery audit trail logging email/WhatsApp dispatch attempts, statuses, and errors.                                                                                                                                                                            |

---

## 5. Complete Module & Route Directory

Every module is located in `src/modules/` and registered in `AppModule`:

| Module                            | Base Route                        | Key Endpoints & Capabilities                                                                                                                                                                 |
| --------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`AuthModule`**                  | `/api/v1/auth`                    | `POST /register`, `POST /login`, `POST /refresh`, `POST /forgot-password`, `POST /reset-password`, `POST /verify-otp`, `GET /google`                                                         |
| **`UsersModule`**                 | `/api/v1/users`                   | `GET /me`, `PATCH /me`, `GET /`, `POST /`, `PATCH /:id`, `PATCH /:id/role`, `GET /:id/permissions`, `PATCH /:id/permissions`                                                                 |
| **`CustomerModule`**              | `/api/v1/customers`               | `GET /` (paginated, search, tags, types), `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` (soft-delete), `GET /stats/types`                                                                |
| **`QuoteModule`**                 | `/api/v1/quotes`                  | `POST /` (create with groups), `GET /`, `GET /:id`, `PATCH /:id`, `POST /calculate` (live pricing), `POST /:id/send-email`, `POST /:id/send-whatsapp`, `POST /:id/mockups`                   |
| **`QuoteModule` (Public)**        | `/api/v1/quotes/public`           | `GET /:id` (view quote), `POST /:id/approve` (triggers Job + Invoice), `POST /:id/request-revision`, `POST /:id/decline`                                                                     |
| **`JobModule`**                   | `/api/v1/jobs`                    | `GET /` (Kanban list), `POST /`, `GET /:id`, `PATCH /:id`, `PATCH /:id/status` (requires note; writes to `JobStatusHistory`)                                                                 |
| **`InvoiceModule`**               | `/api/v1/invoices`                | `GET /` (status counts & tab badges), `POST /` (manual), `GET /:id`, `PATCH /:id` (DRAFT only), `POST /:id/send` (triggers Stripe), `GET /summary`, `GET /payments`, `GET /payments/summary` |
| **`StripeModule`**                | `/api/v1/stripe`                  | `POST /webhook` (verifies rawBody against Stripe signature; handles `invoice.payment_succeeded`, `invoice.payment_failed`)                                                                   |
| **`PriceMatricsModule`**          | `/api/v1/price-matrics`           | CRUD for price matrices and nested volume tiers (`quantity`, `basePrice`, `markup`)                                                                                                          |
| **`ProductModule`**               | `/api/v1/product`                 | `GET /` (filtering, category, brand), `POST /` (auto-resolves brand/category), `GET /autocomplete`, `POST /colors/batch`                                                                     |
| **`BrandModule`**                 | `/api/v1/brand`                   | CRUD for garment brands (`name`, soft-delete support)                                                                                                                                        |
| **`CategoryModule`**              | `/api/v1/category`                | CRUD for apparel categories (`name`, soft-delete support)                                                                                                                                    |
| **`SanMarModule`**                | `/api/v1/sanmar`                  | `GET /products/autocomplete` (fast search), `POST /sync-sftp` (download/parse zip), `GET /products/:styleNo`, `GET /inventory/:styleNo`, `GET /products/raw/:styleNo`                        |
| **`WhatsAppModule`**              | `/api/v1/whatsapp`                | `POST /webhook` (Meta inbound), `GET /webhook` (Meta verify challenge), `GET /conversations`, `GET /conversations/:id/messages`, `POST /send`                                                |
| **`EmailTrackerModule`**          | `/api/v1/email-tracker`           | `GET /threads`, `GET /threads/:id`, `POST /reply`, automated Gmail sync via `@Cron` job with structured quote/invoice regex extraction                                                       |
| **`MailModule`**                  | N/A (Service)                     | Nodemailer with Handlebars templates (`quote-email`, `invoice-email`, `promotional-email`, etc.)                                                                                             |
| **`CampaignModule`**              | `/api/v1/campaigns`               | `GET /`, `POST /`, `POST /:id/send`, `POST /send-promotional-email` (bulk dispatch), `POST /validate-discount` (promo code checks)                                                           |
| **`AnalyticsModule`**             | `/api/v1/analytics`               | `GET /dashboard` (revenue trends, active jobs, pending approvals, unpaid invoices), `GET /reports` (customer growth, sold products)                                                          |
| **`ProfileShopModule`**           | `/api/v1/profile-shop`            | `GET /active`, `PATCH /active` (shop name, logo via Cloudinary, timezone, contact info)                                                                                                      |
| **`VendorsModule`**               | `/api/v1/vendors`                 | CRUD for supplier directory (`ACTIVE` vs `INACTIVE`)                                                                                                                                         |
| **`LineItemCustomizationModule`** | `/api/v1/line-item-customization` | `GET /`, `PATCH /` (toggles line item column visibility and adult/youth/toddler/infant sizing presets)                                                                                       |

---

## 6. Key Business Flows & Lifecycles

### A. Quoting & Pricing Calculation Formula

1. **Size Volume**: Line item quantity is dynamically calculated from `sizeBreakdown: { "S": 10, "M": 20, "L": 30 }` (sum = 60 pieces).
2. **Matrix Lookup**: If `matrixId` is present, the service queries `PriceMatrix.priceTiers` for the tier where `totalQuantity >= tier.quantity`. It retrieves `basePrice` (print cost per unit) and `markup` percentage.
3. **Unit Price Formula**:
   $$\text{unitPrice} = (\text{baseCost} \times (1 + \frac{\text{markupPrice}}{100})) + \text{printCost}$$
4. **Line Item Total**: $\text{total} = \text{unitPrice} \times \text{itemsCount}$.
5. **Quote Total**: $\text{total} = (\text{subtotal} - \text{discount}) + \text{taxAmount}$.

### B. Quote Approval & Downstream Automation

When a quote is marked `APPROVED` (either by an admin via `PATCH /quotes/:id` / `PATCH /quotes/:id/status` or by the customer via `POST /quotes/public/:id/approve`):

1. **Job Created/Updated**: `JobService.createOrUpdateJobFromQuote(quoteId)` creates a `Job` record in `APPROVED` status with line item description summaries and amounts.
2. **Invoice Created**: `CustomerInvoiceService.createFromQuote(quoteId)` auto-generates a new `CustomerInvoice` in `DRAFT` status, assigning a serial `INV-xxxx` number and cloning all line items.

### C. Job Production Pipeline

Production proceeds through strict statuses:
$$\text{QUOTE} \rightarrow \text{APPROVED} \rightarrow \text{ART} \rightarrow \text{NEED\_TO\_ORDER} \rightarrow \text{ORDER\_ARRIVED} \rightarrow \text{PRODUCTION} \rightarrow \text{PAYMENT} \rightarrow \text{SHIP} \rightarrow \text{COMPLETED}$$

- Every status update requires a descriptive note.
- Writes an immutable record to `JobStatusHistory` for audit compliance.

### D. Invoicing & Stripe Installment System

1. **DRAFT Invoice Review**: Admin selects a `PaymentTerm` (e.g., "50% Deposit", "Net 30").
2. **Send Invoice (`POST /invoices/:id/send`)**:
   - Ensures or creates a Stripe Customer (`stripeCustomerId`).
   - If `depositPercent` is set (e.g., 50%):
     - Calculates Deposit Amount and Balance Amount.
     - Creates two `InvoiceInstallment` records (#1 Deposit due in 1 day, #2 Balance due in `paymentDaysAllowed`).
     - Generates and finalizes a Stripe Invoice for Installment #1, retrieving `hosted_invoice_url` and `invoice_pdf`.
   - If Full Payment: Creates a single Stripe Invoice for the full amount.
   - Dispatches payment links to the customer via Email (Nodemailer/Handlebars) and/or WhatsApp.
3. **Stripe Webhook (`POST /stripe/webhook`)**:
   - Validates raw payload against `STRIPE_WEBHOOK_SECRET`.
   - On `invoice.payment_succeeded`:
     - Creates an idempotent `Payment` record.
     - Updates Installment #1 to `PAID`.
     - Marks invoice status as `PARTIAL` (if installments remain) or `PAID` (if fully settled).
     - If `dueDateStrategy === 'FROM_PREVIOUS_PAID'`, adjusts the due date of installment #2 starting from the payment timestamp.

### E. SanMar Supplier Catalog Sync

- **SFTP Sync (`POST /api/v1/sanmar/sync-sftp`)**: Connects to `ftp.sanmar.com:2200`, downloads compressed `SanMar_EPDD_csv.zip`, extracts the CSV, streams parsing via `csv-parse`, and builds fast in-memory maps (`STYLE_COLOR` and `STYLE`).
- **SOAP APIs (`/api/v1/sanmar/products/:styleNo`, `/inventory/:styleNo`)**: Connects to SanMar PromoStandards WSDL endpoints for real-time inventory levels, warehouse quantities, and distributor pricing.
- **Product Autocomplete (`GET /api/v1/sanmar/products/autocomplete`)**: Blazing fast search over hundreds of thousands of SanMar SKU variants.

### F. Dynamic Brand & Category Auto-Resolution

In `ProductService`:

- If an admin inputs `"other"` or a custom brand/category name not currently in the database, `resolveBrand` and `resolveCategory` dynamically create and link the entity on-the-fly, preventing foreign key aborts.

---

## 7. Critical Architectural Quirks & Developer Rules ("Gotchas")

1. **Multi-File Prisma Schemas**:
   - The schema is partitioned in `prisma/schema/*.prisma`.
   - Do NOT expect or create a single root `prisma/schema.prisma`.
   - Always place new models or enum updates in their appropriate domain file (e.g., `quote.prisma`, `customer.prisma`).
2. **Express `rawBody: true` Requirement**:
   - In `main.ts`, `NestFactory.create(AppModule, { rawBody: true })` is mandatory.
   - Stripe webhook verification (`stripe.webhooks.constructEvent`) calculates HMAC signatures on the raw unparsed `Buffer`. Never disable or intercept raw body parsing on `/stripe/webhook`.
3. **Soft Delete Conventions**:
   - `Customer`, `Brand`, and `Category` models use soft-deletion via `isDeleted Boolean @default(false)`.
   - When writing database queries or joins, always include `{ isDeleted: false }` to avoid returning archived entities.
4. **Sequential Numbering Patterns**:
   - **Quotes**: Formatted as `Q-xxxx` (e.g. `Q-1001`). Generated by querying the latest quote and incrementing via regex.
   - **Invoices**: Formatted as `INV-xxxx` (e.g. `INV-1001`). Generated inside a database transaction by reading and incrementing `InvoiceInformation.invoiceSeed`.
5. **SanMar In-Memory Indexing**:
   - The SanMar catalog consists of over 100,000 apparel variants. Writing every variant to PostgreSQL on every sync would cause major database bloat.
   - Instead, the SFTP service indexes parsed CSV data into two fast in-memory Maps (`catalogMap` and `styleIndexMap`). Autocomplete and product searches query these memory maps in sub-milliseconds.
6. **Public Route Bypasses**:
   - The `@Public()` decorator bypasses the global `JwtAuthGuard`.
   - Public customer actions (`/quotes/public/:id`, `/quotes/public/:id/approve`, etc.) and webhooks (`/stripe/webhook`, `/whatsapp/webhook`) use `@Public()`.
   - When adding customer-facing or webhook endpoints, always use `@Public()`.

---

## 8. API Architecture & Conventions

- **Global Prefix**: `/api/v1` (excluded on `/` and `/health`).
- **Swagger Documentation**: Accessible at `/api/v1/docs` with Bearer auth support.
- **Standard Response Format**: Handled by `TransformInterceptor`:
  - Single entity: `{ statusCode: 200, success: true, message: "...", data: { ... } }`
  - Paginated list: `{ statusCode: 200, success: true, message: "...", data: [ ... ], meta: { total, page, limit, totalPages } }`
- **Error Handling**: Handled by `GlobalExceptionFilter` mapping Prisma error codes (`P2002`, `P2025`, etc.) to clean JSON responses with HTTP status codes.

---

## 9. Testing Infrastructure

The project includes an extensive test suite across 3 tiers:

- **Unit Tests** (`src/**/*.spec.ts`): Tests for services, controllers, and helper logic using Jest mocks.
- **Integration Tests** (`test/integration/*.int.spec.ts`): 15 comprehensive suites connecting directly to a PostgreSQL database (e.g., Neon test database).
- **End-to-End Tests** (`test/e2e/*.e2e-spec.ts`): 16 full E2E suites testing complete HTTP request-response cycles with Supertest.
- **Commands**:
  ```bash
  npm run test        # Unit tests
  npm run test:int    # Integration tests
  npm run test:e2e    # E2E tests
  ```

---

## 10. Development & Deployment Quick Reference

### Running Locally

```bash
# 1. Start database and redis services
docker-compose up postgres pgadmin -d

# 2. Run migrations / push schema
npx prisma db push

# 3. Start development server
npm run start:dev
```

### Environment Variables Key Checklist

- `DATABASE_URL`: PostgreSQL connection string (`postgresql://postgres:changeme@localhost:5433/mydb?schema=public` or Neon DB string).
- `JWT_SECRET`: Secret key for JWT signing.
- `SHOP_NAME`: Default shop identifier (e.g., `Francys` or `MAK SERVI`).
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: Stripe payment processing.
- `SANMAR_SFTP_USERNAME`, `SANMAR_SFTP_PASSWORD`: Credentials for `ftp.sanmar.com:2200`.
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`: Meta Cloud API WhatsApp messaging.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Media management.
