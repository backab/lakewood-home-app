export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare("SELECT * FROM home_systems ORDER BY created_at DESC").all();
  return Response.json(results);
}
export async function onRequestPost(context) {
  const formData = await context.request.formData();
  const id = formData.get('id');
  const name = formData.get('name');
  const desc = formData.get('description');
  const link = formData.get('doc_link');
  const imageFile = formData.get('image');
  
  let imageUrl = formData.get('existing_image_url') || ""; 

  // FIX: Use arrayBuffer() instead of stream() for Cloudflare R2
  if (imageFile && imageFile.size > 0) {
      const fileName = Date.now() + "-" + imageFile.name.replace(/\s+/g, '-');
      const buffer = await imageFile.arrayBuffer();
      await context.env.BUCKET.put(fileName, buffer, { httpMetadata: { contentType: imageFile.type } });
      imageUrl = `/api/images/${fileName}`; 
  }

  if (id) {
    await context.env.DB.prepare("UPDATE home_systems SET name=?, description=?, doc_link=?, image_url=? WHERE id=?").bind(name, desc, link, imageUrl, id).run();
  } else {
    await context.env.DB.prepare("INSERT INTO home_systems (name, description, doc_link, image_url) VALUES (?, ?, ?, ?)").bind(name, desc, link, imageUrl).run();
  }
  return Response.json({ success: true });
}
