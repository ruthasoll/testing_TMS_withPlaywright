export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} in .env before running this test. See .env.example.`);
  return value;
}

export function isProductionUrl(url: string): boolean {
  const hostname = new URL(url).hostname.toLowerCase();
  const hosts = ['garritms.com', ...(process.env.TMS_PRODUCTION_HOSTS ?? '').split(',')];
  return hosts.some((host) => {
    const domain = host.trim().toLowerCase();
    return domain && (hostname === domain || hostname.endsWith(`.${domain}`));
  });
}
