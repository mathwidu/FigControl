import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CollectionsModule } from "./collections/collections.module";
import { validateEnv } from "./config/env";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    JwtModule.register({ global: true }),
    PrismaModule,
    AuthModule,
    AdminModule,
    CatalogModule,
    CollectionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
