export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare("SELECT * FROM home_systems ORDER BY created_at DESC").all();
    return Response.json(results);
  } catch (error) { return new Response("Error", { status: 500 }); }
}

export async function onRequestPost(context) {
  try {
    // We use formData here instead of JSON because we are sending a physical image file
    const formData = await context.request.formData();
    const name = formData.get('name');
    const desc = formData.get('description');
    const link = formData.get('doc_link');
    const imageFile = formData.get('image');

    let imageUrl = "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?q=80&w=800&auto=format&fit=crop"; // Default

    // If an image was uploaded, save it to the R2 Bucket!
    if (imageFile && imageFile.size > 0) {
        const fileName = Date.now() + "-" + imageFile.name.replace(/\s+/g, '-');
        await context.env.BUCKET.put(fileName, imageFile.stream(), {
            httpMetadata: { contentType: imageFile.type }
        });
        imageUrl = `/api/images/${fileName}`; // This points to the file we will create next
    }

    await context.env.DB.prepare(
      "INSERT INTO home_systems (name, description, doc_link, image_url) VALUES (?, ?, ?, ?)"
    ).bind(name, desc, link, imageUrl).run();

    return Response.json({ success: true });
  } catch (error) { return new Response(error.message, { status: 500 }); }
}