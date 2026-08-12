import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }, // Handle Next.js 15 async params safely
) {
  try {
    const params = await props.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // 1. Authenticate User
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Execute Delete Query with explicit user_id filter
    const { error: deleteError } = await supabase
      .from("jobs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete evaluation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error: unknown | Error) {
    console.error("Unhandled DELETE route exception:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
