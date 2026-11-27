export interface MapLocationData {
  latLon?: unknown;
  addressName?: string | null;
  addressStreet?: string | null;
  addressZipcode?: string | null;
  addressCity?: string | null;
}

interface MapLinks {
  address: string;
  google: string | null;
  waze: string | null;
  apple: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Construit une adresse complète et les liens universels vers les applications cartographiques. */
export function createMapLinks(location: MapLocationData): MapLinks {
  const address = [
    location.addressName,
    location.addressStreet,
    location.addressZipcode,
    location.addressCity,
  ]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .join(" ")
    .trim();

  // Une recherche textuelle est plus fiable que lat_lon pour les adresses
  // issues de différents formats OpenData. Elle est donc toujours prioritaire.
  if (address.length > 0) {
    const encodedAddress = encodeURIComponent(address);
    return {
      address,
      latitude: null,
      longitude: null,
      google: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
      waze: `https://waze.com/ul?q=${encodedAddress}&navigate=yes`,
      apple: `https://maps.apple.com/?q=${encodedAddress}`,
    };
  }

  const coordinates = parseCoordinates(location.latLon);
  if (!coordinates) {
    return {
      address: "",
      latitude: null,
      longitude: null,
      google: null,
      waze: null,
      apple: null,
    };
  }

  const { latitude, longitude } = coordinates;
  return {
    address: "",
    latitude,
    longitude,
    google: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    waze: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
    apple: `https://maps.apple.com/?q=${latitude},${longitude}&ll=${latitude},${longitude}`,
  };
}

function parseCoordinates(
  value: unknown,
): { latitude: number; longitude: number } | null {
  if (Array.isArray(value) && value.length >= 2) {
    const first = Number(value[0]);
    const second = Number(value[1]);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      // Certains jeux de données renvoient [latitude, longitude].
      return { latitude: first, longitude: second };
    }
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const latitude = record.lat ?? record.latitude;
    const longitude = record.lon ?? record.lng ?? record.longitude;
    if (typeof latitude === "number" && typeof longitude === "number") {
      return { latitude, longitude };
    }
  }

  if (typeof value === "string") {
    const coordinates = value
      .split(";")
      .flatMap((part) => part.split(","))
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (coordinates.length >= 2) {
      const first = Number(coordinates[0]);
      const second = Number(coordinates[1]);
      if (Number.isFinite(first) && Number.isFinite(second)) {
        // Le format OpenData courant est "latitude,longitude".
        return { latitude: first, longitude: second };
      }
    }
  }

  return null;
}
