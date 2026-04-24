# Template Symfony — Authentification utilisateur

Ce projet est un template de démarrage pour développer une application web avec **Symfony 7.4 LTS**. Il embarque une gestion des utilisateurs minimale : une entité `User`, un formulaire de connexion, et une commande console pour créer des utilisateurs. C'est une base de travail idéale pour les projets de BTS SIO.

---

## Prérequis

- PHP 8.2+
- [Composer](https://getcomposer.org/)
- [Symfony CLI](https://symfony.com/download)
- MariaDB (installé localement)

---

## Installation et démarrage

```bash
# 1. Cloner le dépôt
git clone <url-du-depot>
cd <nom-du-dossier>

# 2. Installer les dépendances PHP
composer install

# 3. Créer votre fichier de configuration local
cp .env .env.local
# Éditez .env.local et renseignez vos identifiants MariaDB (voir section ci-dessous)

# 4. Créer la base de données
symfony console doctrine:database:create

# 5. Appliquer les migrations (crée les tables)
symfony console doctrine:migrations:migrate

# 6. Créer un premier utilisateur
symfony console app:add-user prenom.nom@exemple.fr monmotdepasse --role ROLE_ADMIN

# 7. Démarrer le serveur de développement
symfony server:start -d
```

Rendez-vous sur [https://127.0.0.1:8000/login](https://127.0.0.1:8000/login) pour accéder au formulaire de connexion.

---

## Configurer la connexion à MariaDB

### Bonne pratique : `.env` vs `.env.local`

Symfony charge les variables d'environnement depuis plusieurs fichiers. Voici la règle à retenir :

| Fichier | Versionné (git) ? | Usage |
|---|---|---|
| `.env` | **Oui** | Valeurs par défaut, sans données sensibles |
| `.env.local` | **Non** (dans `.gitignore`) | Vos identifiants réels, propres à votre poste |

**Le fichier `.env` est commité dans le dépôt git.** Il est donc potentiellement visible par tout le monde si le dépôt est public (GitHub, GitLab...). Il ne doit jamais contenir de mots de passe réels.

**Le fichier `.env.local` n'est jamais commité.** C'est ici que chaque développeur renseigne ses propres identifiants. Symfony lui donne automatiquement la priorité sur `.env`.

> **Risque concret :** des milliers de bases de données sont compromises chaque année parce que des développeurs ont commité leurs identifiants par erreur. Même un dépôt "privé" peut devenir public, être forké, ou être indexé par des outils de scan automatique. Prenez cette habitude dès maintenant.

### Configurer `.env.local`

Après avoir copié `.env` en `.env.local` (étape 3 de l'installation), ouvrez `.env.local` et modifiez la ligne `DATABASE_URL` avec vos identifiants MariaDB :

```dotenv
DATABASE_URL="mysql://utilisateur:motdepasse@127.0.0.1:3306/nom_de_la_base?serverVersion=10.11.2-MariaDB&charset=utf8mb4"
```

| Paramètre | Valeur à remplacer | Exemple |
|---|---|---|
| `utilisateur` | Votre utilisateur MariaDB | `root` |
| `motdepasse` | Votre mot de passe | `secret` |
| `nom_de_la_base` | Nom de la base à créer | `monprojet` |

Le fichier `.env` du projet conserve une `DATABASE_URL` avec des valeurs fictives (`!ChangeMe!`). C'est volontaire : il sert de **modèle documenté** pour savoir quelles variables configurer, sans exposer de vraies données.

---

## Architecture du projet — Concepts clés de Symfony

### Vue d'ensemble

Symfony suit le patron **MVC** (Modèle – Vue – Contrôleur). Voici comment les dossiers du projet y correspondent :

| Dossier / Fichier | Rôle dans MVC |
|---|---|
| `src/Entity/` | **Modèle** — les classes PHP qui représentent les données |
| `src/Controller/` | **Contrôleur** — traite les requêtes HTTP et retourne des réponses |
| `templates/` | **Vue** — les fichiers Twig qui génèrent le HTML |
| `src/Repository/` | Couche d'accès aux données (requêtes SQL via Doctrine) |
| `config/` | Configuration des services, de la sécurité, des routes... |
| `migrations/` | Scripts SQL générés automatiquement par Doctrine |

---

### Le cycle d'une requête HTTP dans Symfony

Quand un utilisateur accède à une URL, voici ce qui se passe :

```
Navigateur → Requête HTTP
    → Symfony Router identifie le Contrôleur à appeler
        → Le Contrôleur traite la logique métier
            → Il appelle éventuellement un Repository pour lire/écrire en base
                → Il rend une vue Twig
                    → Réponse HTTP renvoyée au navigateur
```

---

### Les Entités et Doctrine ORM (`src/Entity/User.php`)

Une **entité** est une classe PHP ordinaire qui représente une table en base de données. Symfony utilise **Doctrine ORM** pour faire le lien entre la classe et la table, sans écrire de SQL à la main.

```php
#[ORM\Entity(repositoryClass: UserRepository::class)]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private ?string $email = null;
    ...
}
```

Les **attributs PHP** (les `#[ORM\...]`) sont des annotations qui indiquent à Doctrine comment mapper la classe vers la base de données :
- `#[ORM\Entity]` → cette classe est une entité (une table)
- `#[ORM\Column]` → ce champ est une colonne en base
- `#[ORM\Id]` + `#[ORM\GeneratedValue]` → clé primaire auto-incrémentée

`User` implémente `UserInterface` et `PasswordAuthenticatedUserInterface` : c'est ce qui permet au composant Security de Symfony de l'utiliser comme entité d'authentification.

> **Commande utile :** Pour générer une nouvelle entité, utilisez `symfony console make:entity`.

---

### Les Migrations

Les **migrations** sont des fichiers PHP (dans `migrations/`) qui décrivent l'évolution du schéma de la base de données. Elles sont générées automatiquement depuis vos entités.

```bash
# Générer une migration après avoir modifié une entité
symfony console doctrine:migrations:diff

# Appliquer les migrations en attente
symfony console doctrine:migrations:migrate
```

> Ne modifiez jamais directement la base de données à la main. Passez toujours par les migrations pour garder une trace des changements.

---

### Les Contrôleurs et les Routes (`src/Controller/SecurityController.php`)

Un **contrôleur** est une classe PHP dont chaque méthode publique traite une URL. La **route** (l'URL) est définie directement sur la méthode grâce à un attribut PHP.

```php
class SecurityController extends AbstractController
{
    #[Route(path: '/login', name: 'app_login')]
    public function login(AuthenticationUtils $authenticationUtils): Response
    {
        $error = $authenticationUtils->getLastAuthenticationError();
        $lastUsername = $authenticationUtils->getLastUsername();

        return $this->render('security/login.html.twig', [
            'last_username' => $lastUsername,
            'error' => $error,
        ]);
    }
}
```

Points clés :
- `#[Route('/login', name: 'app_login')]` → définit l'URL et un **nom de route** (utilisé dans les liens Twig avec `{{ path('app_login') }}`)
- `$this->render(...)` → rend un template Twig en lui passant des variables
- Les **services** comme `AuthenticationUtils` sont injectés automatiquement par Symfony (**injection de dépendances**)

> **Commande utile :** Pour créer un nouveau contrôleur, utilisez `symfony console make:controller`.

---

### Le Système de Sécurité (`config/packages/security.yaml`)

La sécurité dans Symfony se configure dans `security.yaml`. Ce fichier définit trois choses essentielles :

**1. Le `provider` — où chercher les utilisateurs**
```yaml
providers:
    app_user_provider:
        entity:
            class: App\Entity\User
            property: email  # on identifie l'utilisateur par son email
```

**2. Le `firewall` — Contient le paramétrage de tout ce qui tourne autour de l'authentification et des autorisations**
```yaml
firewalls:
    main:
        form_login:
            login_path: app_login   # route vers le formulaire de connexion
            check_path: app_login   # route qui vérifie les identifiants
            enable_csrf: true       # protection contre les attaques CSRF
        logout:
            path: app_logout
```

**3. L'`access_control` — qui peut accéder à quoi**
```yaml
access_control:
    # - { path: ^/admin, roles: ROLE_ADMIN }
    # - { path: ^/profile, roles: ROLE_USER }
```

Décommentez ces lignes pour restreindre l'accès à certaines URLs selon le rôle de l'utilisateur.

**Les rôles** : chaque utilisateur possède un tableau de rôles (ex: `ROLE_USER`, `ROLE_ADMIN`). `ROLE_USER` est toujours attribué par défaut (voir `User::getRoles()`). Symfony supporte la hiérarchie de rôles : un `ROLE_ADMIN` peut hériter de `ROLE_USER`.

> Pour protéger une route directement dans un contrôleur : `$this->denyAccessUnlessGranted('ROLE_ADMIN');`

---

### Les Templates Twig (`templates/`)

**Twig** est le moteur de templates de Symfony. Il génère du HTML à partir de variables passées par le contrôleur.

Syntaxe de base :
```twig
{# Afficher une variable #}
{{ variable }}

{# Condition #}
{% if error %}
    <p>{{ error.messageKey }}</p>
{% endif %}

{# Boucle #}
{% for item in items %}
    <li>{{ item.name }}</li>
{% endfor %}

{# Générer une URL depuis un nom de route #}
<a href="{{ path('app_login') }}">Se connecter</a>

{# Héritage de templates : base.html.twig définit la mise en page #}
{% extends 'base.html.twig' %}
{% block body %}
    {# Contenu spécifique à la page #}
{% endblock %}
```

---

### L'Asset Mapper et les assets front-end (`assets/`)

Symfony intègre l'**Asset Mapper** : un système qui sert les fichiers du dossier `assets/` directement au navigateur, sans étape de compilation. Pas de `npm install`, pas de webpack, pas de Vite.

**Comment ça fonctionne :**

Dans `base.html.twig`, la fonction Twig `{{ importmap('app') }}` génère automatiquement une balise `<script type="importmap">` dans le `<head>`. Cette balise indique au navigateur où trouver chaque module JavaScript, puis charge `assets/app.js` comme point d'entrée.

`assets/app.js` importe ensuite tout ce dont l'application a besoin :

```js
import './bootstrap.js';             // démarre Stimulus (auto-découverte des contrôleurs)
import './styles/app.css';           // votre CSS personnalisé
import 'bootstrap/dist/css/bootstrap.min.css';
```

Les paquets tiers (Bootstrap, Stimulus…) sont gérés par Composer et stockés dans `assets/vendor/`. Pour en ajouter un :

```bash
symfony console importmap:require nom-du-paquet
```

**Les contrôleurs Stimulus** sont des fichiers JavaScript dans `assets/controllers/` nommés `nom_controller.js`. Ils sont auto-découverts et connectés au HTML via des attributs `data-*` :

```html
<!-- active le contrôleur assets/controllers/counter_controller.js -->
<div data-controller="counter">
    <strong data-counter-target="count">0</strong>
    <button data-action="counter#increment">+</button>
</div>
```

Rendez-vous sur `/demo` pour voir un exemple interactif en fonctionnement.

---

### Les Commandes Console (`src/Command/AddUserCommand.php`)

Symfony permet de créer des **commandes console** personnalisées. C'est très utile pour des tâches d'administration (créer des données, envoyer des e-mails en masse, etc.).

```bash
symfony console app:add-user prenom.nom@exemple.fr motdepasse --role ROLE_ADMIN
```

La commande est déclarée avec l'attribut `#[AsCommand]` et hérite de `Command`. Elle utilise les mêmes services que les contrôleurs (injection de dépendances) : ici `UserPasswordHasherInterface` pour hacher le mot de passe, et `EntityManagerInterface` pour sauvegarder en base.

> **Commande utile :** Pour créer une nouvelle commande, utilisez `symfony console make:command`.

---

## Étendre ce template

Voici quelques pistes pour enrichir ce template dans vos projets :

| Besoin | Commande Symfony |
|---|---|
| Ajouter une entité | `symfony console make:entity` |
| Créer un contrôleur | `symfony console make:controller` |
| Générer un formulaire | `symfony console make:form` |
| Créer une migration | `symfony console doctrine:migrations:diff` |
| Créer une commande console | `symfony console make:command` |
| Lister toutes les routes | `symfony console debug:router` |
| Lister tous les services | `symfony console debug:container` |

---

## Références

- [Documentation officielle Symfony](https://symfony.com/doc/current/index.html)
- [Doctrine ORM](https://www.doctrine-project.org/projects/orm.html)
- [Twig](https://twig.symfony.com/)
- [Symfony Security](https://symfony.com/doc/current/security.html)
