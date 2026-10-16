# Nuxt admin directory scaffold

Folder structure only, following Nuxt 4 conventions. This is not a runnable
application: no packages, configuration, pages, authentication, or API endpoints
have been implemented. The existing mobile app and Express server are unchanged.

```text
admin/
├── app/
│   ├── assets/         # Styles and bundled assets
│   ├── components/     # Reusable Vue components
│   ├── composables/    # Shared Vue logic
│   ├── layouts/        # Page layouts
│   ├── middleware/     # Client navigation guards
│   ├── pages/          # Dashboard routes
│   ├── plugins/        # Nuxt plugins
│   └── utils/          # Client utilities
├── public/             # Static files
├── server/
│   ├── api/            # Server API routes
│   ├── middleware/     # Server request middleware
│   └── utils/          # Server-only helpers
└── shared/
    └── types/          # Shared TypeScript types
```

Empty folders contain `.gitkeep` files so Git preserves them.
Before any admin data is exposed, server-side administrator authorization
must be implemented; client navigation guards alone are not access control.
