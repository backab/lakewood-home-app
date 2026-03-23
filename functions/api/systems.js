export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare("SELECT * FROM home_systems").all();
    return Response.json(results);
  } catch (error) {
    return new Response("Error fetching systems", { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const id = formData.get('id');
    const name = formData.get('name');
    const description = formData.get('description');
    const doc_link = formData.get('doc_link');
    const vendor_name = formData.get('vendor_name') || "";
    const vendor_phone = formData.get('vendor_phone') || "";
    const imageFile = formData.get('image');
    let imageUrl = formData.get('existing_image_url') || "";

    // 🚨 THE FIX: Check if we have a file, and convert it to raw data (ArrayBuffer) instead of a fragile stream
    if (imageFile && imageFile.name && imageFile.size > 0) {
      const fileName = Date.now() + "-" + imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '');
      
      const fileData = await imageFile.arrayBuffer(); // This forces Cloudflare to read the whole file!
      
      await context.env.BUCKET.put(fileName, fileData, {
        httpMetadata: { contentType: imageFile.type }
      });
      imageUrl = `/api/images/${fileName}`;
    }

    if (id) {
      await context.env.DB.prepare(
        "UPDATE home_systems SET name=?, description=?, doc_link=?, image_url=?, vendor_name=?, vendor_phone=? WHERE id=?"
      ).bind(name, description, doc_link, imageUrl, vendor_name, vendor_phone, id).run();
    } else {
      await context.env.DB.prepare(
        "INSERT INTO home_systems (name, description, doc_link, image_url, vendor_name, vendor_phone) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(name, description, doc_link, imageUrl, vendor_name, vendor_phone).run();
    }
    return Response.json({ success: true });
  } catch (error) {
    return new Response("Error saving system: " + error.message, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    const id = new URL(context.request.url).searchParams.get('id');
    await context.env.DB.prepare("DELETE FROM home_systems WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (error) { 
    return new Response("Error", { status: 500 }); 
  }
}
