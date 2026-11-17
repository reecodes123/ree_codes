# Revised normalization and relational schema

Verified on 2026-11-17 by reading the configured PostgreSQL database's public-schema metadata. No application records were exported and no database structure was changed. This describes 16 application tables; _prisma_migrations is an internal migration table and is excluded. Column names preserve PostgreSQL casing.

## First Normal Form (1NF)

The implementation stores distinct entities in named tables rather than one universal article-system table. Ordinary scalar attributes occupy individual columns, and rows are identified by primary or unique keys. Administrators and editors share users and are distinguished by role. There are no separate anonymous-reader, article-like, or article-bookmark tables. Reader selections are browser-local and article engagement is stored as aggregate counters.

Strict relational caveat: articles.contentImageUrls, about_page.missionPillars, and about_page.achievements contain structured JSON collections. PostgreSQL stores each as one typed value, but under the classical interpretation requiring no nested repeating groups, these collections are not fully decomposed into 1NF relations. This document preserves the implemented design and does not claim that JSON storage proves classical 1NF compliance. HTML content is treated as one document value, not as separately queried relational attributes.

## Second Normal Form (2NF)

For tables satisfying 1NF, 2NF additionally requires that every non-prime attribute depend on the whole of every candidate key, with no partial dependency. The main entities use single-column IDs; daily_visits uses date. accounts also has a composite unique key on (provider, providerAccountId), whose intended meaning is one provider account. verification_tokens uses its actual database key constraints shown below; do not invent an id or primary key when none exists. Unique indexes may implement additional candidate keys and must also be considered. A single-column primary key alone is not a complete proof of 2NF when other composite candidate keys exist.

Examples of intended dependencies:

- users.id → email, displayName, passwordHash, role, and other user attributes.
- articles.id → title, content, categoryId, authorId, and other article attributes.
- categories.id → name, slug, description, sortOrder, createdAt, updatedAt.
- accounts.(provider, providerAccountId) → the provider-account record attributes.
- daily_visits.date → visitors.

No artificial intermediate universal table is presented as a historical migration stage. The same implemented entity tables are retained in this analysis. JSON caveats from 1NF carry forward.

## Third Normal Form (3NF)

For each nontrivial functional dependency X → A, 3NF requires X to be a superkey or A to be a prime attribute. In ordinary terms, non-key descriptive information should not depend transitively on a key through another non-key determinant. Category details are stored in categories rather than repeated in articles. Editorial-position details are stored in positions and referenced by board_members.positionId. User account details are stored in users and referenced by the actual foreign keys listed below.

Important implementation qualifications:

- articles.articleBy is a public byline independent of the internal authorId; it is not a copy of users.displayName.
- article_revisions stores historical snapshots. editedById and editedByName are not enforced user foreign keys; do not draw such a relationship or assume the stored name is always a current user name.
- activity_logs.targetType and targetId identify audit targets without enforced foreign keys.
- articles.coverImageUrl and JSON image URLs are not foreign keys to media_assets.
- Aggregate counters, historical snapshots, and JSON content are deliberate implementation choices. JSON collections prevent an unconditional classical 3NF claim for the whole database. Database constraints alone cannot prove every business functional dependency.

Documentation-ready conclusion: The database separates the main relational entities to reduce duplication and uses foreign keys for the relationships shown below. Its scalar relational portions are designed around full-key dependencies and separation of entity descriptions, while structured JSON content and historical snapshots are retained as explicit implementation choices. Full classical 3NF compliance is not asserted for the entire physical database.

## Current physical relational schema

PK = declared primary key; FK = enforced foreign key. Nullable is indicated explicitly. Prisma relation properties are not physical columns. Enums are types, not separate tables.

### about_page

`about_page(id [PK], heroEyebrow [nullable], heroTitle, heroSubtitle [nullable], heroImageUrl [nullable], overview, missionPillars, achievements, updatedAt)`

- PRIMARY KEY: (id)


### accounts

`accounts(id [PK], userId [FK], type, provider, providerAccountId, refresh_token [nullable], access_token [nullable], expires_at [nullable], token_type [nullable], scope [nullable], id_token [nullable], session_state [nullable])`

- PRIMARY KEY: (id)
- FK: userId → users.id

### activity_logs

`activity_logs(id [PK], action, targetType, targetId [nullable], summary, createdAt, actorId [FK, nullable])`

- PRIMARY KEY: (id)
- FK: actorId → users.id

### article_revisions

`article_revisions(id [PK], articleId [FK], title, excerpt [nullable], content, status, editedById, editedByName, createdAt)`

- PRIMARY KEY: (id)
- FK: articleId → articles.id

### articles

`articles(id [PK], slug, title, subheadline [nullable], excerpt [nullable], content, coverImageUrl, contentImageUrls [nullable], featured, status, publishedAt [nullable], views, likes, bookmarks, createdAt, updatedAt, categoryId [FK], authorId [FK, nullable], photoCredit [nullable], articleBy)`

- PRIMARY KEY: (id)
- FK: authorId → users.id
- FK: categoryId → categories.id

### board_members

`board_members(id [PK], name, description [nullable], imageUrl [nullable], sortOrder, createdAt, updatedAt, userId [FK, nullable], positionId [FK])`

- PRIMARY KEY: (id)
- FK: positionId → positions.id
- FK: userId → users.id

### categories

`categories(id [PK], name, slug, description [nullable], sortOrder, createdAt, updatedAt)`

- PRIMARY KEY: (id)


### daily_visits

`daily_visits(date [PK], visitors)`

- PRIMARY KEY: (date)


### feedback

`feedback(id [PK], message, name [nullable], status, submittedAt)`

- PRIMARY KEY: (id)


### media_assets

`media_assets(id [PK], url, fileName, mimeType, sizeBytes, createdAt, uploadedById [FK, nullable])`

- PRIMARY KEY: (id)
- FK: uploadedById → users.id

### positions

`positions(id [PK], name, tier, sortOrder, createdAt, updatedAt)`

- PRIMARY KEY: (id)


### sessions

`sessions(id [PK], sessionToken, userId [FK], expires)`

- PRIMARY KEY: (id)
- FK: userId → users.id

### terms_page

`terms_page(id [PK], content, version, updatedAt)`

- PRIMARY KEY: (id)


### users

`users(id [PK], email, displayName, passwordHash, role, active, avatarUrl [nullable], createdAt, updatedAt, sessionVersion, termsAcceptedVersion [nullable], canApproveArticles)`

- PRIMARY KEY: (id)


### verification_tokens

`verification_tokens(identifier, token, expires)`




### website_settings

`website_settings(id [PK], siteName, tagline, logoUrl [nullable], heroHeadline, heroSubheadline, announcement [nullable], organizationName, organizationDescription, contactEmail, socialFacebook, socialX, socialInstagram, socialYoutube, footerText, updatedAt, academicYear)`

- PRIMARY KEY: (id)


## Suggested captions for the revised figures

1. First Normal Form analysis of the implemented PostgreSQL schema, with structured JSON exceptions identified.
2. Second Normal Form analysis showing full-key dependencies in the relational entity tables.
3. Third Normal Form analysis showing separation of user, category, position, article, and supporting entities, with implementation qualifications.

The three figures may retain the same entity separation when no further decomposition is justified. Do not alter keys between 2NF and 3NF solely to make the figures look different. A strict fully normalized alternative would require separate relations for the JSON collections and would be a proposed redesign, not the current database.
