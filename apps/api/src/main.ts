import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv(process.env);
const app = await NestFactory.create(AppModule.forRoot(env));
await app.listen(env.PORT);
