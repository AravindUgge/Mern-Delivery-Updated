import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env["FRONTEND_URL"],
      "https://mern-delivery-updated.vercel.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5000",
    ].filter(Boolean) as string[];

    if (process.env["VERCEL_URL"]) {
      allowedOrigins.push(`https://${process.env["VERCEL_URL"]}`);
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "API is running!" });
});

app.use("/api", router);

export default app;
