export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare("SELECT * FROM manual_todos WHERE is_completed = 0").all();
  return Response.json(results);
}
export async function onRequestPost(context) {
  const todo = await context.request.json();
  await context.env.DB.prepare("INSERT INTO manual_todos (text) VALUES (?)").bind(todo.text).run();
  return Response.json({ success: true });
}
export async function onRequestPut(context) {
  const todo = await context.request.json();
  // If we pass is_completed: 0, it un-checks it! Otherwise, it assumes 1 (completed).
  const state = todo.is_completed !== undefined ? todo.is_completed : 1;
  
  await context.env.DB.prepare("UPDATE manual_todos SET is_completed = ? WHERE id=?").bind(state, todo.id).run();
  return Response.json({ success: true });
}
