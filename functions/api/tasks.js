export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare("SELECT * FROM system_tasks").all();
  return Response.json(results);
}
export async function onRequestPost(context) {
  const t = await context.request.json();
  await context.env.DB.prepare("INSERT INTO system_tasks (system_name, task_title, task_date, recurrence, show_in_todo) VALUES (?, ?, ?, ?, ?)")
    .bind(t.system_name, t.task_title, t.task_date, t.recurrence, t.show_in_todo ? 1 : 0).run();
  return Response.json({ success: true });
}
export async function onRequestPut(context) {
  const t = await context.request.json();
  await context.env.DB.prepare("UPDATE system_tasks SET system_name=?, task_title=?, task_date=?, recurrence=?, show_in_todo=? WHERE id=?")
    .bind(t.system_name, t.task_title, t.task_date, t.recurrence, t.show_in_todo ? 1 : 0, t.id).run();
  return Response.json({ success: true });
}
export async function onRequestDelete(context) {
  const id = new URL(context.request.url).searchParams.get('id');
  await context.env.DB.prepare("DELETE FROM system_tasks WHERE id = ?").bind(id).run();
  return Response.json({ success: true });
}

// PATCH: Quick updates for pushing dates back OR acknowledging
export async function onRequestPatch(context) {
  try {
    const body = await context.request.json();
    
    if (body.action === 'push_back') {
      // Pushing back changes the date and un-hides it!
      await context.env.DB.prepare(
        "UPDATE system_tasks SET task_date = ?, acknowledged = 0 WHERE id = ?"
      ).bind(body.new_date, body.id).run();
      
    } else if (body.action === 'acknowledge') {
      // Acknowledging hides it from the home page and stops notifications
      await context.env.DB.prepare(
        "UPDATE system_tasks SET acknowledged = 1 WHERE id = ?"
      ).bind(body.id).run();
    }
    
    return Response.json({ success: true });
  } catch (error) { 
    return new Response("Error", { status: 500 }); 
  }
}
