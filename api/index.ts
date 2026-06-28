import express from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

// Initialize routes asynchronously
let routesRegistered = false;
const initPromise = registerRoutes(httpServer, app).then(() => {
  routesRegistered = true;
});

// Middleware to ensure routes are initialized before handling requests
app.use(async (req, res, next) => {
  if (!routesRegistered) {
    await initPromise;
  }
  next();
});

export default app;
