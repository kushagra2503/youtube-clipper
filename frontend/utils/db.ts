import { supabase } from "@/lib/supabase-client";

export async function saveToken(name: string, toolName: string, token: string) {
  try {
    // 1. ✅ Check if user exists, if not create it
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("username", name)
      .single();

    if (userError || !userData) {
      console.log("👤 User not found, creating new user...");

      const { data: newUser, error: createUserError } = await supabase
        .from("users")
        .insert({ username: name })
        .select("id")
        .single();

      if (createUserError || !newUser) {
        throw new Error("Failed to create new user");
      }

      userData = newUser;
    }

    const userId = userData.id;

    // 2. ✅ Get tool_id by tool name
    let { data: toolData, error: toolError } = await supabase
      .from("tools")
      .select("id")
      .eq("tool_name", toolName)
      .single();

    if (toolError || !toolData) {
      throw new Error("Tool not found in tools table");
    }

    const toolId = toolData.id;

    // 3. ✅ Upsert into user_tools (creates or updates the token)
    const { error: upsertError } = await supabase.from("user_tools").upsert(
      {
        user_id: userId,
        tool_id: toolId,
        tool_token: token,
      },
      {
        onConflict: "user_id,tool_id", // Ensures only one row per user-tool combo
      },
    );

    if (upsertError) throw upsertError;

    console.log(`🔐 Token saved for user ${name} in tool ${toolName}`);
  } catch (err) {
    console.error("❌ Failed to save token:", err);
    throw err;
  }
}

export async function getUserDetailsByName(name: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", name)
      .single();

    if (error || !data) throw new Error("User not found");
    return data;
  } catch (err) {
    console.error("❌ Failed to fetch user details:", err);
    throw err;
  }
}

export async function getToolsForUser(name: string) {
  try {
    // Get user_id by name
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("username", name)
      .single();

    if (userError || !userData) throw new Error("User not found");

    const userId = userData.id;

    // Get all tools for the user from user_tools
    const { data: userTools, error: userToolsError } = await supabase
      .from("user_tools")
      .select("*")
      .eq("user_id", userId);

    if (userToolsError) throw userToolsError;
    // console.log("🔧 Fetched tools for user:", userTools);
    return userTools;
  } catch (err) {
    console.error("❌ Failed to fetch tools for user:", err);
    throw err;
  }
}

export async function removeToolForUser(name: string, toolId: number) {
  try {
    // Get user_id by name
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("username", name)
      .single();

    if (userError || !userData) throw new Error("User not found");
    const userId = userData.id;

    // Delete the tool for the user from user_tools
    console.log("🗑️ Removing tool for user:", { userId, toolId });
    const { error: deleteError } = await supabase
      .from("user_tools")
      .delete()
      .eq("user_id", userId)
      .eq("tool_id", toolId);

    if (deleteError) throw deleteError;
    return true;
  } catch (err) {
    console.error("❌ Failed to remove tool for user:", err);
    throw err;
  }
}
