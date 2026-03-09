// This function handles requests to grab data FROM the database
export async function onRequestGet(context) {
  try {
    // context.env.DB is the connection to your Cloudflare D1 Database
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM system_tasks ORDER BY task_date ASC"
    ).all();
    
    // Send the database rows back to the phone as JSON
    return Response.json(results);
  } catch (error) {
    return new Response("Database error", { status: 500 });
  }
}

// This function handles requests to save NEW data TO the database
export async function onRequestPost(context) {
  try {
    // Read the incoming data sent from your phone
    const newTask = await context.request.json();
    
    // Insert it securely into the database
    await context.env.DB.prepare(
      "INSERT INTO system_tasks (system_name, task_title, task_date) VALUES (?, ?, ?)"
    )
    .bind(newTask.system_name, newTask.task_title, newTask.task_date)
    .run();
    
    return new Response(JSON.stringify({ success: true }), { 
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response("Failed to save task", { status: 500 });
  }
}