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
