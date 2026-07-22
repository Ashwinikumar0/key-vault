import { protocol } from "electron";
import * as path from "path";
import * as fs from "fs";

export class ProtocolHandler {
  private sessionToken: string | null = null;

  public register(): void {
    protocol.handle("app", async (request) => {
      const url = new URL(request.url);
      let filePath = url.pathname;

      if (filePath.startsWith("/")) {
        filePath = filePath.substring(1);
      }

      // 1. Intercept and proxy API calls to the local Go backend sidecar
      if (filePath.startsWith("api/")) {
        const targetUrl = `http://localhost:8080/${filePath}${url.search}`;
        
        if (filePath.startsWith("api/auth/logout")) {
          this.sessionToken = null;
          console.log("[PROTOCOL HANDLER] Cleared session token on logout.");
        }

        const headers = new Headers();
        request.headers.forEach((val, key) => {
          if (
            key.toLowerCase() !== "host" && 
            key.toLowerCase() !== "cookie" && 
            key.toLowerCase() !== "authorization"
          ) {
            headers.set(key, val);
          }
        });

        if (this.sessionToken) {
          headers.set("Authorization", `Bearer ${this.sessionToken}`);
          headers.set("Cookie", `token=${this.sessionToken}`);
        }

        try {
          const response = await fetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: request.method !== "GET" && request.method !== "HEAD" ? await request.arrayBuffer() : undefined,
            duplex: "half"
          } as any);

          const responseHeaders = new Headers();
          response.headers.forEach((val, key) => {
            responseHeaders.set(key, val);
          });

          const setCookie = response.headers.get("set-cookie");
          if (setCookie) {
            const match = setCookie.match(/token=([^;]+)/);
            if (match) {
              this.sessionToken = match[1];
              console.log("[PROTOCOL HANDLER] Captured session token from login response.");
            }
          }

          responseHeaders.set("Access-Control-Allow-Origin", "app://index.html");
          responseHeaders.set("Access-Control-Allow-Credentials", "true");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
          });
        } catch (e) {
          console.error(`[PROTOCOL HANDLER] API proxy failed to route to ${targetUrl}:`, e);
          return new Response("API Proxy Error", { status: 502 });
        }
      }

      // 2. Serve static React files
      if (!filePath || filePath === "index.html") {
        filePath = "index.html";
      }

      const rootPath = path.normalize(path.join(__dirname, "../frontend-dist"));
      const absolutePath = path.normalize(path.join(rootPath, filePath));

      if (!absolutePath.startsWith(rootPath)) {
        return new Response("Access Denied", { status: 403 });
      }

      if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
        const indexHtmlPath = path.join(rootPath, "index.html");
        return new Response(fs.readFileSync(indexHtmlPath), {
          headers: { "content-type": "text/html" }
        });
      }

      const ext = path.extname(absolutePath).toLowerCase();
      let mimeType = "text/plain";
      if (ext === ".html") mimeType = "text/html";
      else if (ext === ".js") mimeType = "text/javascript";
      else if (ext === ".css") mimeType = "text/css";
      else if (ext === ".svg") mimeType = "image/svg+xml";
      else if (ext === ".json") mimeType = "application/json";
      else if (ext === ".png") mimeType = "image/png";
      else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".woff2") mimeType = "font/woff2";

      try {
        return new Response(fs.readFileSync(absolutePath), {
          headers: { "content-type": mimeType }
        });
      } catch (e) {
        return new Response("Error reading file", { status: 500 });
      }
    });
  }
}
