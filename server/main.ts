// server/main.ts
import { Application, Router } from "jsr:@oak/oak"; // Ensure you have a recent version of Oak
import { oakCors } from "jsr:@tajpouria/cors"; // Use jsr prefix
import routeStaticFilesFrom from "./util/routeStaticFilesFrom.ts"; // Assuming this utility exists as per template

// WebSocket handling removed as mirroring is now client-side via localStorage
// handleWs function removed
// --- Oak Application Setup ---
export const app = new Application();
const router = new Router();

// Example API route (like the dinosaur example) - Keep or remove as needed
// import data from "./api/data.json" with { type: "json" };
// router.get("/api/dinosaurs", (context) => { ... });
// router.get("/api/dinosaurs/:dinosaur", (context) => { ... });

// WebSocket route (/ws) removed
// --- Middleware and Server Start ---
app.use(oakCors()); // Enable CORS if needed (especially if client/server ports differ during dev without proxy)
app.use(router.routes());
app.use(router.allowedMethods());

// Static file serving (ensure paths match your template structure)
// This should serve the built React app from client/dist
app.use(routeStaticFilesFrom([
    `${Deno.cwd()}/client/dist`, // Serve built files
    // `${Deno.cwd()}/client/public`, // Serve public assets if needed directly
]));

// Catch-all for SPA routing (if not handled by routeStaticFilesFrom or specific routes)
// Redirects requests that don't match API/WS/static files to index.html
app.use(async (ctx, next) => {
  if (!ctx.request.url.pathname.startsWith('/api')) { // Removed check for /ws
      try {
        // Modify path if your index.html is within client/dist
        await ctx.send({ root: `${Deno.cwd()}/client/dist`, index: "index.html" });
      } catch {
        await next();
      }
  } else {
      await next();
  }
});


if (import.meta.main) {
    console.log("Server listening on http://localhost:8090");
    await app.listen({ port: 8090 });
}