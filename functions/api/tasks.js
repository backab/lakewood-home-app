export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare("SELECT * FROM system_tasks").all();
    return Response.json(results);
  } catch (error) { return new Response("Error", { status: 500 }); }
}

export async function onRequestPost(context) {
  try {
    const newTask = await context.request.json();
    await context.env.DB.prepare(
      "INSERT INTO system_tasks (system_name, task_title, task_date, recurrence) VALUES (?, ?, ?, ?)"
    ).bind(newTask.system_name, newTask.task_title, newTask.task_date, newTask.recurrence).run();
    return Response.json({ success: true });
  } catch (error) { return new Response("Error", { status: 500 }); }
}

export async function onRequestPut(context) {
  try {
    const task = await context.request.json();
    await context.env.DB.prepare(
      "UPDATE system_tasks SET system_name=?, task_title=?, task_date=?, recurrence=? WHERE id=?"
    ).bind(task.system_name, task.task_title, task.task_date, task.recurrence, task.id).run();
    return Response.json({ success: true });
  } catch (error) { return new Response("Error", { status: 500 }); }
}

export async function onRequestDelete(context) {
  try {
    const id = new URL(context.request.url).searchParams.get('id');
    await context.env.DB.prepare("DELETE FROM system_tasks WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (error) { return new Response("Error", { status: 500 }); }
}
