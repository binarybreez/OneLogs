/** The DOCUMENTED surface. Anything the app serves that is not here is a shadow endpoint. */
export const DOCUMENTED = [
  { method: 'POST', path: '/login' },
  { method: 'GET', path: '/orders/{id}' },
  { method: 'GET', path: '/products' },
  { method: 'GET', path: '/profile' },
  { method: 'PUT', path: '/profile' },
] as const;

export function openApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of DOCUMENTED) {
    (paths[r.path] ??= {})[r.method.toLowerCase()] = {
      responses: { '200': { description: 'OK' } },
    };
  }
  return {
    openapi: '3.0.3',
    info: { title: 'Lab Shop API', version: '1.0.0' },
    paths,
  };
}
