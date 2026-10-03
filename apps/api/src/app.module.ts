import { Module, type DynamicModule } from "@nestjs/common";
import { ENV, type Env } from "./config/env.js";
import { MetaController } from "./meta/meta.controller.js";

@Module({})
export class AppModule {
  /** Takes the already-validated env so tests can boot the app with their own. */
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      global: true,
      controllers: [MetaController],
      providers: [{ provide: ENV, useValue: env }],
      exports: [ENV],
    };
  }
}
