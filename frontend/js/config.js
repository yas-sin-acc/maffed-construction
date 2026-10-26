/* ====================================================================
   WHERE IS THE BACKEND?
   After you deploy the backend (see the README), paste its address below
   (no slash at the end). The website and owner panel will talk to it.
   When you test on your own computer, this is chosen automatically.
   ==================================================================== */
const PRODUCTION_API = "https://YOUR-BACKEND-NAME.onrender.com";
const API_BASE = ["localhost", "127.0.0.1"].includes(location.hostname) ? "http://localhost:3000" : PRODUCTION_API;
