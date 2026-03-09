// GET: Fetch all tasks
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare("SELECT * FROM system_tasks").all();
    return Response.json(results);
  } catch (error) {
    return new Response("Database Error", { status: 500 });
  }
}

// POST: Create a new task
export async function onRequestPost(context) {
  try {
    const newTask = await context.request.json();
    await context.env.DB.prepare(
      "INSERT INTO system_tasks (system_name, task_title, task_date) VALUES (?, ?, ?)"
    ).bind(newTask.system_name, newTask.task_title, newTask.task_date).run();
    
    return Response.json({ success: true });
  } catch (error) {
    return new Response("Failed to save task", { status: 500 });
  }
}

// PUT: Edit an existing task
export async function onRequestPut(context) {
  try {
    const updatedTask = await context.request.json();
    await context.env.DB.prepare(
      "UPDATE system_tasks SET system_name = ?, task_title = ?, task_date = ? WHERE id = ?"
    ).bind(updatedTask.system_name, updatedTask.task_title, updatedTask.task_date, updatedTask.id).run();
    
    return Response.json({ success: true });
  } catch (error) {
    return new Response("Failed to update task", { status: 500 });
  }
}

// DELETE: Remove a task
export async function onRequestDelete(context) {
  try {
    // Grab the ID from the URL (e.g., /api/tasks?id=5)
    const { searchParams } = new URL(context.request.url);
    const id = searchParams.get('id');
    
    await context.env.DB.prepare("DELETE FROM system_tasks WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (error) {
    return new Response("Failed to delete task", { status: 500 });
  }
}
