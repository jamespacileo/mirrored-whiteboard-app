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


// Function to open browser based on OS
async function openBrowser(url: string) {
  let command: string;
  let args: string[] = [url];

  switch (Deno.build.os) {
    case "darwin": // macOS
      command = "open";
      break;
    case "windows":
      command = "cmd";
      // Need to escape special characters like '&' for cmd.exe
      args = ["/c", "start", url.replace(/&/g, "^&")];
      break;
    case "linux":
      command = "xdg-open";
      break;
    default:
      console.warn(`Unsupported OS: ${Deno.build.os}. Cannot automatically open browser.`);
      return;
  }

  try {
    console.log(`Attempting to open browser: ${command} ${args.join(" ")}`);
    const openCmd = new Deno.Command(command, {
      args: args,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stderr } = await openCmd.output();
    if (code !== 0) {
      console.error(`Failed to open browser (code: ${code}): ${new TextDecoder().decode(stderr)}`);
    } else {
      console.log("Browser open command issued.");
    }
  } catch (error) {
    console.error(`Error executing browser open command: ${error}`);
  }
}


if (import.meta.main) {
    const port = 8090;
    const url = `http://localhost:${port}`;
    console.log(`Server listening on ${url}`);

    // Start listening
    const listenerPromise = app.listen({ port });

    // Attempt to open the browser after the server starts
    listenerPromise.then(() => {
        console.log("Server started, attempting to open browser...");
        // Use a timeout to give the system a moment before trying to open
        setTimeout(() => openBrowser(url), 500);
    }).catch(err => {
        console.error("Failed to start server:", err);
        Deno.exit(1); // Exit if server fails
    });

    // Keep the server running
    await listenerPromise;
}