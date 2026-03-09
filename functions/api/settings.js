export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare("SELECT * FROM app_settings").all();
  const settings = {};
  results.forEach(row => settings[row.key] = row.value);
  return Response.json(settings);
}

export async function onRequestPost(context) {
  const formData = await context.request.formData();
  const imageFile = formData.get('image');
  const title = formData.get('title');
  const subtitle = formData.get('subtitle');

  // Save Text Copy
  if (title) await context.env.DB.prepare("INSERT INTO app_settings (key, value) VALUES ('home_title', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(title).run();
  if (subtitle) await context.env.DB.prepare("INSERT INTO app_settings (key, value) VALUES ('home_subtitle', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(subtitle).run();

  // FIX: Use arrayBuffer() for image upload
  if (imageFile && imageFile.size > 0) {
      const fileName = "home-" + Date.now() + "-" + imageFile.name.replace(/\s+/g, '-');
      const buffer = await imageFile.arrayBuffer();
      await context.env.BUCKET.put(fileName, buffer, { httpMetadata: { contentType: imageFile.type } });
      const imageUrl = `/api/images/${fileName}`; 
      
      await context.env.DB.prepare("INSERT INTO app_settings (key, value) VALUES ('home_image', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(imageUrl).run();
  }
  return Response.json({ success: true });
}