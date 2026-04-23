import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to extract Shopee image
  app.post("/api/extract", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      // 1. Parse URL to get shopid and itemid
      const match = url.match(/(\d{5,})[/.](\d{5,})/);
      if (!match) {
        // Try fallback regex for different URL formats
        const productIdMatch = url.match(/i\.(\d+)\.(\d+)/);
        if (!productIdMatch) {
           return res.status(400).json({ error: "Could not parse Shopee URL" });
        }
        var shopId = productIdMatch[1];
        var itemId = productIdMatch[2];
      } else {
        var shopId = match[1];
        var itemId = match[2];
      }

      // 2. Call Shopee API
      const apiHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": `https://shopee.vn/product-i.${shopId}.${itemId}`,
        "X-Requested-With": "XMLHttpRequest",
        "X-Api-Source": "pc",
        "X-Shopee-Language": "vi",
      };

      try {
        const response = await axios.get("https://shopee.vn/api/v4/item/get", {
          params: { shopid: shopId, itemid: itemId },
          headers: apiHeaders,
          timeout: 10000,
        });

        const item = response.data?.data;
        if (item && item.images && item.images.length > 0) {
          const imageUrl = `https://down-vn.img.susercontent.com/file/${item.images[0]}`;
          return res.json({ imageUrl, name: item.name });
        }
      } catch (apiError: any) {
        console.warn(`API extraction failed (Status ${apiError.response?.status || 'Unknown'}), trying HTML fallback...`);
      }

      // 3. Fallback to HTML Regex if API fails
      const browserHeaders = {
        ...apiHeaders,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
      };

      const htmlResponse = await axios.get(url, { headers: browserHeaders, timeout: 10000 });
      const imgRegex = /https:\/\/down-vn\.img\.susercontent\.com\/file\/[a-zA-Z0-9\-]+/g;
      const matches = htmlResponse.data.match(imgRegex);

      if (matches && matches.length > 0) {
        // Find product name in HTML if possible
        const titleMatch = htmlResponse.data.match(/<title>(.*?)<\/title>/);
        const name = titleMatch ? titleMatch[1].replace(" | Shopee Việt Nam", "").trim() : "Extracted from HTML";
        return res.json({ imageUrl: matches[0], name });
      }

      return res.status(404).json({ error: "No images found" });
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.statusText || error.message;
      console.error(`Extraction error (${status}):`, message);
      return res.status(status).json({ error: `Shopee Error: ${message}` });
    }
  });

  // Ping endpoint for anti-coldstart
  app.get("/api/ping", (req, res) => {
    res.status(200).send("pong");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Anti-coldstart mechanism for Render free tier
    const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
    if (RENDER_EXTERNAL_URL) {
      console.log(`Anti-coldstart enabled. Pinging ${RENDER_EXTERNAL_URL}/api/ping every 5 minutes.`);
      setInterval(async () => {
        try {
          await axios.get(`${RENDER_EXTERNAL_URL}/api/ping`);
          console.log(`[Anti-coldstart] Ping to ${RENDER_EXTERNAL_URL} successful.`);
        } catch (error: any) {
          console.error(`[Anti-coldstart] Ping failed:`, error.message);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  });
}

startServer();
