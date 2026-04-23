export interface HttpSecurityChecks {
  missingHsts: boolean;
  missingXFrameOptions: boolean;
  missingXContentTypeOptions: boolean;
  missingCsp: boolean;
  serverVersionDisclosed: boolean;
  detectedServerHeader: string | null;
  missingReferrerPolicy: boolean;
}

export function checkHttpSecurity(
  headers: Record<string, string>,
  isHttps: boolean,
): HttpSecurityChecks {
  const h = (name: string): string | null => headers[name.toLowerCase()] ?? null;

  const serverHeader = h("server");
  const serverVersionDisclosed = serverHeader !== null && /\d/.test(serverHeader);

  return {
    missingHsts: isHttps && !h("strict-transport-security"),
    missingXFrameOptions: !h("x-frame-options"),
    missingXContentTypeOptions: !h("x-content-type-options"),
    missingCsp: !h("content-security-policy"),
    serverVersionDisclosed,
    detectedServerHeader: serverVersionDisclosed ? serverHeader : null,
    missingReferrerPolicy: !h("referrer-policy"),
  };
}
