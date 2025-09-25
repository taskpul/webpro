(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__8978dbac._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/src/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module './lib/regions'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
;
async function middleware(request) {
    const path = request.nextUrl.pathname;
    // 🚀 Skip middleware for public endpoints (tenant signup, etc.)
    if (path.startsWith("/public")) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    let redirectUrl = request.nextUrl.href;
    let response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(redirectUrl, 307);
    let cacheIdCookie = request.cookies.get("_medusa_cache_id");
    let cacheId = cacheIdCookie?.value || crypto.randomUUID();
    const regionMap = await getRegionMap(cacheId);
    const countryCode = regionMap && await getCountryCode(request, regionMap);
    const urlHasCountryCode = countryCode && request.nextUrl.pathname.split("/")[1].includes(countryCode);
    if (urlHasCountryCode && cacheIdCookie) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    if (urlHasCountryCode && !cacheIdCookie) {
        response.cookies.set("_medusa_cache_id", cacheId, {
            maxAge: 60 * 60 * 24
        });
        return response;
    }
    if (request.nextUrl.pathname.includes(".")) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    const redirectPath = request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname;
    const queryString = request.nextUrl.search ? request.nextUrl.search : "";
    if (!urlHasCountryCode && countryCode) {
        redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`;
        response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(`${redirectUrl}`, 307);
    } else if (!urlHasCountryCode && !countryCode) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"]("No valid regions configured. Please set up regions with countries in your Medusa Admin.", {
            status: 500
        });
    }
    return response;
}
const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp|public).*)"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__8978dbac._.js.map