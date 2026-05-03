import { Router } from "express";

const router = Router();

router.get("/proxy-image", async (req, res) => {
  const url = req.query.url as string;
  if (!url || !/^https?:\/\//.test(url)) {
    res.status(400).json({ error: "Missing or invalid url param" });
    return;
  }
  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ZaixBot/1.0)",
        "Accept": "image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      res.status(502).json({ error: `Upstream returned ${upstream.status}` });
      return;
    }
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.set({
      "Content-Type": contentType,
      "Content-Length": String(buf.byteLength),
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });
    res.send(buf);
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Proxy fetch failed" });
  }
});

export default router;
