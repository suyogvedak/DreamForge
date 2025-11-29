// server/routes/generationRoutes.js
import express from "express";
import generateRouter from "./generate.js";

const router = express.Router();

// Mount generate's POST / handler on this router's POST /
router.post("/", (req, res, next) => {
  // delegate to generate router by calling its handler
  // Express Router is a middleware; we forward the request
  generateRouter.handle(req, res, next);
});

export default router;
