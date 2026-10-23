declare global {
  // biome-ignore lint/style/noNamespace: augment Wrangler's generated Cloudflare.Env
  namespace Cloudflare {
    // biome-ignore lint/suspicious/noShadow: Wrangler generates both Env interfaces
    interface Env {
      CLERK_SECRET_KEY: string;
    }
  }

  interface Env {
    CLERK_SECRET_KEY: string;
  }
}

export {};
