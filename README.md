# Lover Letter

A Vite-based web application for creating and sharing love letters.

## Setup Instructions

### Installation

To set up this project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Moira-0327/lover-letter.git
   cd lover-letter
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

   **Note:** Do NOT attempt to install this project as a global npm package using commands like:
   ```bash
   # ❌ INCORRECT - This will fail:
   npm install -g @claude/change-input-font-color-TReeJ

   # ❌ INCORRECT - npm package names cannot contain capital letters
   npm install -g @claude/change-input-font-color-TReeJ
   ```

### Development

Start the development server:
```bash
npm run dev
```

This will launch the Vite development server with hot module replacement (HMR).

### Build

Build for production:
```bash
npm run build
```

### Preview

Preview the production build locally:
```bash
npm run preview
```

## Project Structure

- `src/` - Source code (HTML, CSS, JavaScript)
- `public/` - Static assets
- `vite.config.js` - Vite configuration
- `package.json` - Project dependencies and scripts

## Technologies

- **Vite** - Fast build tool and dev server
- **@vitejs/plugin-basic-ssl** - HTTPS support for development

## Troubleshooting

### npm install errors

If you encounter npm errors:

1. **Invalid package name errors:** These typically occur when trying to install git branch names as npm packages. Use `npm install` in the project directory instead.

2. **Dependency resolution errors:** Try clearing the npm cache:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Token/authentication errors:** If you see "Access token expired or revoked", re-authenticate:
   ```bash
   npm login
   ```

## License

ISC
