import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Browsers show "Not secure" on HTTP. Vercel serves HTTPS by default, but
 * visitors may still open an http:// link; redirect them to HTTPS.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return NextResponse.next();
  }

  const proto = request.headers.get("x-forwarded-proto");
  if (proto === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
