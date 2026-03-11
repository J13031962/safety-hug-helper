export interface GeoAddress {
  full: string;
  city?: string;
  municipality?: string;
  state?: string;
  country?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es&addressdetails=1`,
      { headers: { "User-Agent": "SOSAlert/1.0" } }
    );
    if (!res.ok) throw new Error("Geocode failed");
    const data = await res.json();
    const addr = data.address || {};

    const city = addr.city || addr.town || addr.village || addr.hamlet || "";
    const municipality = addr.county || addr.municipality || "";
    const state = addr.state || "";
    const country = addr.country || "";

    const parts = [city, municipality, state, country].filter(Boolean);
    return {
      full: parts.join(", ") || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      city,
      municipality,
      state,
      country,
    };
  } catch {
    return { full: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }
}
