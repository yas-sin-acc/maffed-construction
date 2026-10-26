/* Starts the backend (port 3000) and the website preview (port 5173) together: npm run dev */
const { spawn } = require("child_process");
const run = (dir, name) => { const p = spawn(process.execPath, ["server.js"], { cwd: dir, stdio: "inherit", env: process.env }); p.on("exit", (c) => { console.log(name + " stopped"); process.exit(c || 0); }); return p; };
run("backend", "backend"); run("frontend", "frontend");
