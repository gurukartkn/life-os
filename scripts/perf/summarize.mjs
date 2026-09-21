// Perf harness only. Prints a compact markdown summary of one or more measure.mjs result files.
//   node scripts/perf/summarize.mjs perf-out/baseline-small-rtt0.json [more.json ...]
import fs from "node:fs";

const m = (s) => (s && s.n ? `${s.median} (p90 ${s.p90}, ${s.min}–${s.max})` : "–");
const c = (s) => (s && s.n ? `${s.median}` : "–");

for (const file of process.argv.slice(2)) {
  const { meta, results } = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`\n### ${meta.label} — commit ${meta.commit}, n=${meta.iterations}, emulated RTT ${meta.emulatedRttMs} ms, ${meta.date}\n`);

  if (results.cold) {
    console.log("**Cold load (ms)**\n\n| Route | TTFB | FCP | load |\n|---|---|---|---|");
    for (const [k, v] of Object.entries(results.cold)) console.log(`| ${k} | ${m(v.ttfbMs)} | ${m(v.fcpMs)} | ${m(v.loadMs)} |`);
  }
  if (results.nav) {
    console.log("\n**Client navigation (median ms; content = click → destination h1)**\n\n| Step | content ms | first DOM change ms | browser requests | server auth calls | server auth ms | server REST calls | server REST ms |\n|---|---|---|---|---|---|---|---|");
    for (const [k, v] of Object.entries(results.nav))
      console.log(`| ${k} | ${m(v.contentMs)} | ${c(v.firstDomChangeMs)} | ${c(v.browserRequests)} | ${c(v.serverAuthCalls)} | ${c(v.serverAuthMs)} | ${c(v.serverRestCalls)} | ${c(v.serverRestMs)} |`);
  }
  if (results.filters) {
    console.log(`\n**Todo filter tabs** (rows shown: ${JSON.stringify(results.filters.expectedRows)})\n\n| Step | content ms | first DOM change ms | browser requests | server REST calls | server auth calls | long-task ms | max event ms | CLS |\n|---|---|---|---|---|---|---|---|---|`);
    for (const [k, v] of Object.entries(results.filters)) {
      if (k === "expectedRows") continue;
      console.log(`| ${k} | ${m(v.contentMs)} | ${c(v.firstDomChangeMs)} | ${c(v.browserRequests)} | ${c(v.serverRestCalls)} | ${c(v.serverAuthCalls)} | ${c(v.longtaskMs)} | ${c(v.eventDurationMaxMs)} | ${v.clsSum} |`);
    }
  }
  if (results.server) {
    console.log("\n**Server, isolated document requests**\n\n| Route | total ms | auth calls | auth ms | REST calls | REST ms |\n|---|---|---|---|---|---|");
    for (const [k, v] of Object.entries(results.server)) console.log(`| ${k} | ${m(v.totalMs)} | ${c(v.authCalls)} | ${c(v.authMs)} | ${c(v.restCalls)} | ${c(v.restMs)} |`);
  }
}
