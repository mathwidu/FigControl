import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AdminAccessService {
  constructor(private readonly configService: ConfigService) {}

  isAdminEmail(email: string | undefined | null): boolean {
    if (!email) return false;
    return this.getAdminEmails().has(normalizeEmail(email));
  }

  private getAdminEmails(): Set<string> {
    const rawEmails =
      this.configService.get<string>("FIGCONTROL_ADMIN_EMAILS") ?? "";
    return new Set(
      rawEmails
        .split(",")
        .map((email) => normalizeEmail(email))
        .filter(Boolean),
    );
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
