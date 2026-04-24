# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (also clears cache, installs assets, importmap)
composer install

# Start dev server
symfony server:start -d

# Run tests
./bin/phpunit

# Database setup
./bin/console doctrine:database:create
./bin/console doctrine:migrations:migrate

# Create a user (email, password, optional roles)
./bin/console app:add-user user@example.com password --role ROLE_ADMIN

# Clear cache
./bin/console cache:clear
```

## Docker

`compose.yaml` provides PostgreSQL 16. `compose.override.yaml` adds Mailpit (SMTP on port 1025, UI on port 8025).

Default DB credentials: `app:!ChangeMe!@localhost:5432/app`

## Architecture

**Symfony 7.4 LTS** template focused on user authentication. No build step — frontend uses Symfony Asset Mapper (no Node.js required).

### Authentication

Form-based login configured in `config/packages/security.yaml`. The firewall uses `form_login` with CSRF protection. Routes: `POST /login` → `app_login`, `GET /logout` → `app_logout` (firewall-handled). `SecurityController` handles the login form render and error retrieval.

### User entity (`src/Entity/User.php`)

Implements `UserInterface` and `PasswordAuthenticatedUserInterface`. Identified by `email` (unique). `roles` is a JSON array defaulting to `[ROLE_USER]`. Password serialization uses CRC32C hashing (Symfony 7.3+ requirement).

`UserRepository` implements `PasswordUpgraderInterface` for automatic password rehashing on login.

### AddUserCommand (`src/Command/AddUserCommand.php`)

CLI command `app:add-user` — validates email format and minimum password length (6 chars), supports multiple `--role` flags. This is the only way to create users (no registration form).

### Database

PostgreSQL via Doctrine ORM. Migrations live in `migrations/`. The single migration (`Version20250908125237`) creates the `user` table and `messenger_messages` table (for Symfony Messenger).

Messenger is configured with a Doctrine transport for async message handling.

### Environment files

- `.env` — base (APP_SECRET empty, DATABASE_URL to PostgreSQL)
- `.env.dev` — dev overrides (APP_SECRET set)
- `.env.test` — test overrides (forces `APP_ENV=test`, reduces bcrypt cost)
