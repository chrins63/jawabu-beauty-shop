import { useEffect, useRef, useState } from 'react'
import { FiCrosshair, FiMapPin, FiSearch } from 'react-icons/fi'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  NAIROBI,
  reverseGeocode,
  searchKenyaPlaces,
} from '../lib/geocode'
import './DeliveryLocationPicker.css'

const pinIcon = L.divIcon({
  className: 'delivery-map-pin',
  html: '<span class="delivery-map-pin-dot"></span>',
  iconSize: [28, 36],
  iconAnchor: [14, 34],
})

export default function DeliveryLocationPicker({
  value,
  onChange,
  disabled = false,
}) {
  const mapNode = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onChangeRef = useRef(onChange)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [hint, setHint] = useState('')

  onChangeRef.current = onChange

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return undefined

    const start = {
      lat: value?.lat || NAIROBI.lat,
      lng: value?.lng || NAIROBI.lng,
    }

    const map = L.map(mapNode.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([start.lat, start.lng], value?.lat ? 16 : 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    map.setMaxBounds([
      [-5.1, 33.5],
      [5.7, 42.1],
    ])

    const marker = L.marker([start.lat, start.lng], {
      icon: pinIcon,
      draggable: !disabled,
    }).addTo(map)

    const applyPin = async (latlng, source) => {
      if (disabled) return
      marker.setLatLng(latlng)
      map.panTo(latlng)
      try {
        const place = await reverseGeocode(latlng.lat, latlng.lng)
        onChangeRef.current?.({
          lat: place.lat,
          lng: place.lng,
          address: place.label,
          city: place.city,
          source,
        })
        setHint('')
      } catch {
        onChangeRef.current?.({
          lat: latlng.lat,
          lng: latlng.lng,
          address: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`,
          city: 'Nairobi',
          source,
        })
      }
    }

    map.on('click', (event) => {
      applyPin(event.latlng, 'map')
    })

    marker.on('dragend', () => {
      applyPin(marker.getLatLng(), 'map')
    })

    mapRef.current = map
    markerRef.current = marker

    const syncSize = () => map.invalidateSize()
    requestAnimationFrame(syncSize)
    const resizeTimer = window.setTimeout(syncSize, 250)
    window.addEventListener('resize', syncSize)

    return () => {
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', syncSize)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Map is created once; later pin moves happen in the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    if (value?.lat == null || value?.lng == null) return
    const next = L.latLng(value.lat, value.lng)
    markerRef.current.setLatLng(next)
    mapRef.current.setView(next, Math.max(mapRef.current.getZoom(), 15))
  }, [value?.lat, value?.lng])

  useEffect(() => {
    const dragging = markerRef.current?.dragging
    if (!dragging) return
    if (disabled) dragging.disable()
    else dragging.enable()
  }, [disabled])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setSuggestions([])
      return undefined
    }

    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchKenyaPlaces(term)
        setSuggestions(results)
        setHint(results.length ? '' : 'No matching places. Try an estate or landmark.')
      } catch {
        setHint('Could not search places right now.')
      } finally {
        setSearching(false)
      }
    }, 280)

    return () => window.clearTimeout(timer)
  }, [query])

  const choosePlace = (place) => {
    setQuery(place.label)
    setSuggestions([])
    onChange?.({
      lat: place.lat,
      lng: place.lng,
      address: place.label,
      city: place.city,
      source: 'search',
    })
    mapRef.current?.setView([place.lat, place.lng], 16)
    markerRef.current?.setLatLng([place.lat, place.lng])
    window.setTimeout(() => mapRef.current?.invalidateSize(), 50)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setHint('This browser cannot share your location.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latlng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        try {
          const place = await reverseGeocode(latlng.lat, latlng.lng)
          onChange?.({
            lat: place.lat,
            lng: place.lng,
            address: place.label,
            city: place.city,
            source: 'gps',
          })
          mapRef.current?.setView([place.lat, place.lng], 17)
          markerRef.current?.setLatLng([place.lat, place.lng])
          setHint('')
        } catch {
          setHint('Found you, but could not read the street name.')
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setHint('Allow location access, or search for your estate instead.')
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  return (
    <div className={`delivery-picker${disabled ? ' is-disabled' : ''}`}>
      <label className="delivery-picker-label" htmlFor="delivery-place-search">
        Delivery location
      </label>
      <p className="delivery-picker-help">
        Search your estate or landmark, tap the map, or drag the gold pin — the
        same way Glovo and Jumia confirm a drop-off.
      </p>

      <div className="delivery-picker-search">
        <FiSearch />
        <input
          id="delivery-place-search"
          type="search"
          placeholder="Search Westlands, Kilimani, Rongai..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={disabled}
          autoComplete="off"
        />
        <button
          type="button"
          className="delivery-picker-gps"
          onClick={useMyLocation}
          disabled={disabled || locating}
        >
          <FiCrosshair />
          {locating ? 'Finding…' : 'Use my location'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <ul className="delivery-picker-suggestions">
          {suggestions.map((place) => (
            <li key={`${place.lat}-${place.lng}-${place.label}`}>
              <button
                type="button"
                onClick={() => choosePlace(place)}
                disabled={disabled}
              >
                <FiMapPin />
                <span>{place.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {searching && (
        <p className="delivery-picker-status">Searching Kenya…</p>
      )}
      {hint && <p className="delivery-picker-status">{hint}</p>}

      <div className="delivery-picker-map" ref={mapNode} />

      <div className="delivery-picker-confirm">
        <FiMapPin />
        <div>
          <strong>
            {value?.lat
              ? 'Pin dropped'
              : 'Tap the map to drop your pin'}
          </strong>
          <span>
            {value?.address ||
              'Choose the gate, building, or roadside where the rider should stop.'}
          </span>
        </div>
      </div>
    </div>
  )
}
