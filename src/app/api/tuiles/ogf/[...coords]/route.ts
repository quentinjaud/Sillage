/** Proxy tuiles OpenGeoFiction pour contourner CORS */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ coords: string[] }> }
) {
  const { coords } = await params;
  // coords = ["z", "x", "y.png"] ou ["z", "x", "y"]
  const chemin = coords.join("/");
  const url = `https://tile.opengeofiction.net/ogf-carto/${chemin}`;

  try {
    const reponse = await fetch(url);
    if (!reponse.ok) {
      return new Response(null, { status: reponse.status });
    }

    const corps = await reponse.arrayBuffer();
    return new Response(corps, {
      headers: {
        "Content-Type": reponse.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
