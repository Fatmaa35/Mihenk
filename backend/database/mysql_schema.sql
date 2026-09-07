CREATE TABLE books (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(200) NOT NULL,
    genre VARCHAR(120) NOT NULL,
    themes_json JSON NOT NULL,
    traits_json JSON NOT NULL,
    description TEXT NOT NULL,
    source_name VARCHAR(80),
    source_url VARCHAR(1000),
    cover_url VARCHAR(1000),
    metadata_updated_at TIMESTAMP(6) NULL,
    INDEX idx_books_genre (genre)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    display_name VARCHAR(80) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;

CREATE TABLE auth_accounts (
    user_id CHAR(36) PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash CHAR(64) NOT NULL,
    password_salt CHAR(32) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_auth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;

CREATE TABLE sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    INDEX idx_sessions_user (user_id),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;

CREATE TABLE user_books (
    user_id CHAR(36) NOT NULL,
    book_id VARCHAR(100) NOT NULL,
    shelf ENUM('read','to_read') NOT NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, book_id),
    INDEX idx_user_books_shelf (user_id, shelf),
    CONSTRAINT fk_user_books_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_books_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;

CREATE TABLE retailers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    robots_url VARCHAR(500) NOT NULL,
    content_policy VARCHAR(255) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;

CREATE TABLE editions (
    isbn CHAR(13) PRIMARY KEY,
    book_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(200),
    publisher VARCHAR(200),
    language CHAR(3),
    published_date VARCHAR(80),
    source_name VARCHAR(80),
    source_url VARCHAR(1000),
    verification_status ENUM('unverified','verified','retailer_verified') NOT NULL DEFAULT 'unverified',
    verified_at TIMESTAMP(6) NULL,
    INDEX idx_editions_book (book_id),
    INDEX idx_editions_verification (verification_status, language),
    CONSTRAINT fk_editions_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;

CREATE TABLE offers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    edition_isbn CHAR(13) NOT NULL,
    retailer_id VARCHAR(50) NOT NULL,
    product_url VARCHAR(1000) NOT NULL,
    price_minor INT UNSIGNED NOT NULL,
    list_price_minor INT UNSIGNED,
    currency CHAR(3) NOT NULL DEFAULT 'TRY',
    stock_status ENUM('in_stock','out_of_stock','unknown') NOT NULL,
    checked_at TIMESTAMP(6) NOT NULL,
    content_hash CHAR(64) NOT NULL,
    UNIQUE KEY uq_offer_url (product_url(500)),
    UNIQUE KEY uq_edition_retailer (edition_isbn, retailer_id),
    CONSTRAINT fk_offers_edition FOREIGN KEY (edition_isbn) REFERENCES editions(isbn) ON DELETE CASCADE,
    CONSTRAINT fk_offers_retailer FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;

CREATE TABLE price_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    offer_id BIGINT NOT NULL,
    price_minor INT UNSIGNED NOT NULL,
    stock_status ENUM('in_stock','out_of_stock','unknown') NOT NULL,
    observed_at TIMESTAMP(6) NOT NULL,
    INDEX idx_price_history_offer_time (offer_id, observed_at),
    CONSTRAINT fk_price_history_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;

CREATE TABLE edition_verification_attempts (
    book_id VARCHAR(100) PRIMARY KEY,
    status ENUM('verified','missing','error') NOT NULL,
    attempted_at TIMESTAMP(6) NOT NULL,
    error VARCHAR(500),
    CONSTRAINT fk_verification_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;
