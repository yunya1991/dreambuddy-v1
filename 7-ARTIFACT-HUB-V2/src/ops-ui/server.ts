import express from "express";
import router from "./routes/index.js";

const app = express();
const PORT = process.env.OPS_UI_PORT ?? 3457;

app.use(router);

app.listen(PORT, () => {
  console.log(`[ops-ui] running at http://localhost:${PORT} (mock mode)`);
});

export default app;
