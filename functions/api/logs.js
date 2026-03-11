export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare("SELECT * FROM maintenance_log ORDER BY id DESC").all();
    return Response.json(results);
  } catch (error) {
    return new Response("Error", { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const log = await context.request.json();
    await context.env.DB.prepare("INSERT INTO maintenance_log (system_name, task_title, completed_date, notes) VALUES (?, ?, ?, ?)")
      .bind(log.system_name, log.task_title, log.completed_date, log.notes).run();
    return Response.json({ success: true });
  } catch (error) {
    return new Response("Error", { status: 500 });
  }
}
