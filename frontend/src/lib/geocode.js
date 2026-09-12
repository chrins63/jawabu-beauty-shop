export const NAIROBI = {
  lat: -1.286389,
  lng: 36.817223,
}

export function mapsUrl(lat, lng) {
  if (lat == null || lng == null) return ''
  return `https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`
}

export function isKenyaPin(lat, lng) {
  const y = Number(lat)
  const x = Number(lng)
  return y >= -5.1 && y <= 5.7 && x >= 33.5 && x <= 42.1
}

function cityFromAddress(address = {}) {
  return (
    address.city ||
    address.town ||
    address.municipality ||
    address.village ||
    address.suburb ||
    address.county ||
    'Nairobi'
  )
}

function labelFromPhoton(properties = {}) {
  return [
    properties.name,
    properties.street,
    properties.district,
    properties.city || properties.county,
    properties.state,
    properties.country,
  ]
    .filter(Boolean)
    .filter((part, index, list) => list.indexOf(part) === index)
    .slice(0, 4)
    .join(', ')
}

export async function searchKenyaPlaces(query) {
  const q = String(query || '').trim()
  if (q.length < 2) return []

  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '7')
  url.searchParams.set('lat', String(NAIROBI.lat))
  url.searchParams.set('lon', String(NAIROBI.lng))
  url.searchParams.set('lang', 'en')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Could not search places right now.')
  }

  const data = await response.json()
  return (data.features || [])
    .map((feature) => {
      const [lng, lat] = feature.geometry?.coordinates || []
      const properties = feature.properties || {}
      if (!isKenyaPin(lat, lng)) return null
      const label = labelFromPhoton(properties)
      return {
        lat,
        lng,
        label,
        city: properties.city || properties.county || properties.state || 'Nairobi',
      }
    })
    .filter(Boolean)
}

export async function reverseGeocode(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('zoom', '18')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return {
      lat,
      lng,
      label: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
      city: 'Nairobi',
    }
  }

  const data = await response.json()
  return {
    lat,
    lng,
    label: data.display_name || `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
    city: cityFromAddress(data.address),
  }
}
