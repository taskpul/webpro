# Tenant Configuration Exports

The tenant provisioning script (`./manage-tenants.sh`) writes storefront
configuration that must be consumed by both the Next.js storefront and the
WordPress multisite theme.

```
/tenants-config
  /wordpress
    /tenants
      <tenant>.json
/front/config
  /tenants
    <tenant>.json
```

Each JSON document follows the structure below:

```json
{
  "tenant": "acme",
  "hostname": "acme.example.com",
  "rootDomain": "example.com",
  "wordpress": {
    "networkId": "1",
    "siteSlug": "acme"
  },
  "storefront": {
    "medusaUrl": "https://api.example.com",
    "publishableKey": "pk_test_..."
  }
}
```

* `tenant` – canonical identifier/slug for the tenant (used by WordPress site
  creation and Medusa provisioning).
* `hostname` – FQDN that should be mapped to the multisite site and storefront
  deployment.
* `rootDomain` – shared apex domain for the network, sourced from `ROOT_DOMAIN`
  in `back/.env`.
* `wordpress.networkId` – optional multisite network identifier for scripts that
  automate site creation.
* `wordpress.siteSlug` – the site slug in the multisite network (defaults to the
  tenant name).
* `storefront.medusaUrl` – Medusa backend URL exposed to the storefront.
* `storefront.publishableKey` – publishable API key injected into the Next.js
  application when available.

The WordPress theme can read from `tenants-config/wordpress/tenants`, whereas
Next.js consumes `front/config/tenants`. Both directories receive the exact same
JSON payload so that shared automation remains deterministic.

## Configuring WordPress multisite storefronts

Network administrators can add or update tenant storefronts directly from the
WordPress host. Each time a new site is provisioned, copy its storefront
credentials into a JSON file that follows the schema above and save it to
`front/config/tenants/<tenant>.json`. The tenant resolver running in the
Next.js storefront will automatically:

1. Detect requests by hostname (for example `acme.example.com`) and inject the
   matching Medusa backend URL and publishable key into the SDK instance used by
   the storefront.
2. Respect multisite network routes by treating any host listed in the
   `WORDPRESS_NETWORK_HOSTS` environment variable—or requests to admin paths such
   as `/wp-admin/network`—as network-level traffic. These requests bypass the
   tenant configuration and fall back to the primary Medusa credentials defined
   by `MEDUSA_BACKEND_URL` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.
3. Provide a default context for the primary multisite domain. If a visitor
   lands on the apex domain (for example `example.com`), the resolver returns the
   default storefront configuration so that the WordPress network admin and root
   site continue to function.

### Steps for site admins

1. Collect the tenant’s storefront credentials (Medusa backend URL,
   publishable API key, optional WordPress metadata).
2. Create or update the corresponding JSON file under
   `front/config/tenants/` and ensure the same file is copied to
   `tenants-config/wordpress/tenants/` so the WordPress theme can read it.
3. If the network admin or root domain should bypass tenant routing, update the
   environment variables in the storefront deployment:
   - `WORDPRESS_NETWORK_HOSTS` – comma-separated list of network admin hosts.
   - `WORDPRESS_NETWORK_ADMIN_PATHS` – optional additional admin paths to ignore
     during tenant resolution.
   - `WORDPRESS_PRIMARY_DOMAINS` – comma-separated list of domains that should
     fall back to the default storefront context.
4. Redeploy the storefront (or purge the configuration cache) so that the new
   settings take effect.
