// Perf harness only. A tiny HTTP proxy that adds a fixed round-trip delay between
// the browser and `next start`, to approximate distance to the server (Chrome's
// own network emulation only sets a latency *floor*, which a slow server hides).
//   node scripts/perf/delay-proxy.mjs --rtt=200 --listen=3100 --target=3000
// Half the delay is added before the request is forwarded, half before the
// response headers are sent back, so each request costs +rtt ms in total.
import http from "node:http";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const rtt = Number(args.rtt ?? 200);
const listen = Number(args.listen ?? 3100);
const target = Number(args.target ?? 3000);
const half = rtt / 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

http
  .createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    await sleep(half);

    const upstream = http.request(
      { host: "127.0.0.1", port: target, method: req.method, path: req.url, headers: req.headers }, // keep the original Host: Server Actions compare it to the Origin header
      async (upstreamRes) => {
        await sleep(half);
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      }
    );
    upstream.on("error", () => {
      res.writeHead(502);
      res.end();
    });
    upstream.end(Buffer.concat(chunks));
  })
  .listen(listen, () => console.log(`delay-proxy :${listen} -> :${target}, +${rtt}ms RTT`));
