import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();

  const { email, full_name, profession, years_experience, company, referral_source } = body;

  if (!email || !full_name || !profession || !years_experience) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Check for existing entry
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This email is already on the waitlist" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("waitlist")
    .insert({
      email,
      full_name,
      profession,
      years_experience,
      company: company || null,
      referral_source: referral_source || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}
