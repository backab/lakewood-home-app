// This handles grabbing data FROM the database to show on your calendar
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM system_tasks"
    ).all();
    
    return Response.json(results);
  } catch (error) {
    return new Response("Database Error", { status: 500 });
  }
}

// This handles saving NEW data TO the database when you fill out the form
export async function onRequestPost(context) {
  try {
    const newTask = await context.request.json();
    
    await context.env.DB.prepare(
      "INSERT INTO system_tasks (system_name, task_title, task_date) VALUES (?, ?, ?)"
    )
    .bind(newTask.system_name, newTask.task_title, newTask.task_date)
    .run();
    
    return Response.json({ success: true });
  } catch (error) {
    return new Response("Failed to save task", { status: 500 });
  }
}
