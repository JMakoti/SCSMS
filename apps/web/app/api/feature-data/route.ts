import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { loadWebFeatureData } from "@/lib/feature-data";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const data = await loadWebFeatureData(user.id);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Could not load web feature data.", error);
    return NextResponse.json(
      { error: "Database records could not be loaded." },
      { status: 500 },
    );
  }
}
