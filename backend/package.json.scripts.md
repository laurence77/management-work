# Package.json Scripts for Environment Validation

Add these scripts to your `package.json` for convenient environment validation:

```json
{
  "scripts": {
    "validate-env": "node scripts/validate-env.js",
    "validate-env:fix": "node scripts/validate-env.js --fix",
    "validate-env:prod": "NODE_ENV=production node scripts/validate-env.js",
    "prestart": "npm run validate-env",
    "prestart:prod": "NODE_ENV=production npm run validate-env"
  }
}
```

## Usage Examples:

### Validate current environment:
```bash
npm run validate-env
```

### Validate with auto-fix suggestions:
```bash
npm run validate-env:fix
```

### Validate production environment:
```bash
npm run validate-env:prod
```

### Validate specific env file:
```bash
node scripts/validate-env.js --env-file=.env.production
```

### Auto-validate before starting server:
```bash
npm start  # Will run validate-env first
```

## Integration with CI/CD:

Add to your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Validate Environment Variables
  run: npm run validate-env:prod
```

This ensures environment validation before deployment and provides clear feedback on configuration issues.