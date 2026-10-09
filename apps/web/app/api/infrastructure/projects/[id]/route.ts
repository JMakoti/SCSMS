import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  deleteInfrastructureProjectRecord,
  updateInfrastructureProjectRecord,
} from "@/lib/infrastructure-projects-server";
import { infrastructureProjectSchema } from "@scsms/features/schemas/infrastructure-project-schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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
    const { id } = await context.params;
    await updateInfrastructureProjectRecord(id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The infrastructure project could not be saved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    await deleteInfrastructureProjectRecord(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The infrastructure project could not be deleted.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
