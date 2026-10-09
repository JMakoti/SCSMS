import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createInfrastructureProjectRecord } from "@/lib/infrastructure-projects-server";
import { infrastructureProjectSchema } from "@scsms/features/schemas/infrastructure-project-schema";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid infrastructure project is required." },
      { status: 400 },
    );
  }

  const parsed = infrastructureProjectSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid infrastructure project values.",
      },
      { status: 400 },
    );
  }

  try {
    const id = await createInfrastructureProjectRecord(parsed.data);
    return NextResponse.json({ id });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The infrastructure project could not be saved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
