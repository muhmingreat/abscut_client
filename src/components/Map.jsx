import { useCallback, useEffect, useRef, useState } from "react";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvent,
} from "react-leaflet";

import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";

import markerIcon from "leaflet/dist/images/marker-icon.png";

import markerShadow from "leaflet/dist/images/marker-shadow.png";

import "leaflet/dist/leaflet.css";
import "./Map.css";

// =====================================================
// LEAFLET MARKER ICON FIX
// =====================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// =====================================================
// DEFAULT MAP POSITION
// =====================================================

const DEFAULT_MAP_CENTER = [9.082, 8.6753];

const DEFAULT_MAP_ZOOM = 6;

const SELECTED_LOCATION_ZOOM = 16;

// =====================================================
// COORDINATE VALIDATION
// =====================================================

export const hasValidCoordinates = (latitude, longitude) => {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return false;
  }

  if (String(latitude).trim() === "" || String(longitude).trim() === "") {
    return false;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

// =====================================================
// MAP RESIZE CONTROLLER
// =====================================================

function MapResizeController() {
  const map = useMap();

  useEffect(() => {
    if (!map) {
      return;
    }

    const refreshMap = () => {
      map.invalidateSize({
        pan: false,
        animate: false,
      });
    };

    refreshMap();

    const frame1 = requestAnimationFrame(() => {
      refreshMap();
    });

    const frame2 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        refreshMap();
      });
    });

    const timer1 = setTimeout(refreshMap, 100);

    const timer2 = setTimeout(refreshMap, 300);

    const timer3 = setTimeout(refreshMap, 600);

    window.addEventListener("resize", refreshMap);

    let observer = null;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        refreshMap();
      });

      const container = map.getContainer();

      if (container) {
        observer.observe(container);
      }

      if (container?.parentElement) {
        observer.observe(container.parentElement);
      }
    }

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      window.removeEventListener("resize", refreshMap);

      observer?.disconnect();
    };
  }, [map]);

  return null;
}

// =====================================================
// MAP POSITION CONTROLLER
// =====================================================
//
// IMPORTANT:
// This controller watches the LOCAL selected position.
// It does NOT depend on the parent's latitude/longitude.
// =====================================================

function MapPositionController({ position }) {
  const map = useMap();

  const lastPositionRef = useRef("");

  useEffect(() => {
    if (!position || position.length !== 2) {
      return;
    }

    const latitude = Number(position[0]);

    const longitude = Number(position[1]);

    if (!hasValidCoordinates(latitude, longitude)) {
      return;
    }

    const positionKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

    // Don't move repeatedly to
    // the same location.
    if (lastPositionRef.current === positionKey) {
      return;
    }

    lastPositionRef.current = positionKey;

    console.log("🚀 MAP MOVING TO SELECTED POSITION:", {
      latitude,
      longitude,
    });

    map.stop();

    map.flyTo([latitude, longitude], SELECTED_LOCATION_ZOOM, {
      animate: true,
      duration: 1.2,
      easeLinearity: 0.25,
    });

    setTimeout(() => {
      map.invalidateSize({
        pan: false,
        animate: false,
      });
    }, 150);
  }, [map, position]);

  return null;
}

// =====================================================
// REVERSE GEOCODING CONTROLLER
// =====================================================

function ReverseGeocodeController({
  latitude,
  longitude,
  onResult,
  onLoading,
  onError,
}) {
  const lastCoordinatesRef = useRef("");

  const requestIdRef = useRef(0);

  const lastRequestTimeRef = useRef(0);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!hasValidCoordinates(latitude, longitude)) {
      return;
    }

    const coordinateKey = `${Number(latitude).toFixed(6)},${Number(
      longitude,
    ).toFixed(6)}`;

    if (lastCoordinatesRef.current === coordinateKey) {
      return;
    }

    lastCoordinatesRef.current = coordinateKey;

    const requestId = ++requestIdRef.current;

    const controller = new AbortController();

    abortControllerRef.current?.abort();

    abortControllerRef.current = controller;

    const reverseGeocode = async () => {
      try {
        if (typeof onLoading === "function") {
          onLoading(true);
        }

        const currentTime = Date.now();

        const timeSinceLastRequest = currentTime - lastRequestTimeRef.current;

        const minimumDelay = 1100;

        const remainingDelay = Math.max(0, minimumDelay - timeSinceLastRequest);

        if (remainingDelay > 0) {
          await new Promise((resolve) => {
            setTimeout(resolve, remainingDelay);
          });
        }

        if (requestId !== requestIdRef.current) {
          return;
        }

        lastRequestTimeRef.current = Date.now();

        const params = new URLSearchParams({
          format: "jsonv2",

          lat: String(latitude),

          lon: String(longitude),

          zoom: "18",

          addressdetails: "1",

          "accept-language": "en",
        });

        console.log("🔎 REVERSE GEOCODING:", {
          latitude,
          longitude,
        });

        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
          {
            method: "GET",

            headers: {
              Accept: "application/json",
            },

            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Reverse geocoding failed: ${response.status}`);
        }

        const data = await response.json();

        if (requestId !== requestIdRef.current) {
          return;
        }

        const address = data.address || {};

        const fullAddress =
          data.display_name ||
          [
            address.house_number,
            address.road,
            address.suburb,
            address.city,
            address.state,
          ]
            .filter(Boolean)
            .join(", ");

        const area =
          address.suburb ||
          address.neighbourhood ||
          address.city_district ||
          address.town ||
          address.village ||
          address.city ||
          "";

        const landmark = data.name || "";

        const result = {
          address: fullAddress,

          area,

          landmark,

          houseNumber: address.house_number || "",

          road: address.road || "",

          city: address.city || address.town || address.village || "",

          state: address.state || "",

          postcode: address.postcode || "",

          country: address.country || "",

          latitude: Number(latitude),

          longitude: Number(longitude),
        };

        console.log("🏠 REVERSE GEOCODE RESULT:", result);

        if (typeof onResult === "function") {
          onResult(result);
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        console.error("❌ REVERSE GEOCODING ERROR:", error);

        if (typeof onError === "function") {
          onError(
            "We found the location, but could not automatically find its address.",
          );
        }
      } finally {
        if (requestId === requestIdRef.current) {
          if (typeof onLoading === "function") {
            onLoading(false);
          }
        }
      }
    };

    reverseGeocode();

    return () => {
      controller.abort();
    };
  }, [latitude, longitude, onResult, onLoading, onError]);

  return null;
}

// =====================================================
// MAP CLICK CONTROLLER
// =====================================================

function MapClickController({ onSelectLocation }) {
  const callbackRef = useRef(onSelectLocation);

  useEffect(() => {
    callbackRef.current = onSelectLocation;
  }, [onSelectLocation]);

  useMapEvent("click", (event) => {
    const target = event.originalEvent?.target;

    if (target?.closest(".leaflet-control")) {
      return;
    }

    if (target?.closest(".leaflet-marker-icon")) {
      return;
    }

    if (target?.closest(".leaflet-marker-shadow")) {
      return;
    }

    if (target?.closest(".leaflet-popup")) {
      return;
    }

    const latitude = Number(event.latlng.lat.toFixed(6));

    const longitude = Number(event.latlng.lng.toFixed(6));

    console.log("🗺️ MAP CLICKED:", {
      latitude,
      longitude,
    });

    callbackRef.current?.(latitude, longitude);
  });

  return null;
}

// =====================================================
// MAIN MAP COMPONENT
// =====================================================

function Map({
  title = "Location",
  latitude = null,
  longitude = null,
  onLocationChange,
  focusRequest = 0,
}) {
  // ===================================================
  // LOCAL SELECTED POSITION
  // ===================================================

  const [position, setPosition] = useState(() => {
    if (hasValidCoordinates(latitude, longitude)) {
      return [Number(latitude), Number(longitude)];
    }

    return null;
  });

  // ===================================================
  // LOCATION DETAILS
  // ===================================================

  const [locationDetails, setLocationDetails] = useState(null);

  // ===================================================
  // CURRENT GPS LOADING
  // ===================================================

  const [locationLoading, setLocationLoading] = useState(false);

  // ===================================================
  // REVERSE GEOCODING LOADING
  // ===================================================

  const [locationLookupLoading, setLocationLookupLoading] = useState(false);

  // ===================================================
  // ERROR
  // ===================================================

  const [locationError, setLocationError] = useState("");

  // ===================================================
  // MAP REF
  // ===================================================

  const mapRef = useRef(null);

  // ===================================================
  // MARKER REF
  // ===================================================

  const markerRef = useRef(null);

  // ===================================================
  // PARENT CALLBACK REF
  // ===================================================

  const callbackRef = useRef(onLocationChange);

  useEffect(() => {
    callbackRef.current = onLocationChange;
  }, [onLocationChange]);

  // ===================================================
  // SEND LOCATION TO PARENT
  // ===================================================

  const sendLocationToParent = useCallback(
    (nextLatitude, nextLongitude, details = null) => {
      if (typeof callbackRef.current !== "function") {
        console.error("❌ onLocationChange is not a function");

        return;
      }

      console.log("📤 LOCATION SENT TO PARENT:", {
        latitude: nextLatitude,
        longitude: nextLongitude,
        details,
      });

      callbackRef.current(nextLatitude, nextLongitude, details);
    },
    [],
  );

  // ===================================================
  // SELECT LOCATION
  // ===================================================

  const handleLocationSelect = useCallback(
    (selectedLatitude, selectedLongitude) => {
      if (!hasValidCoordinates(selectedLatitude, selectedLongitude)) {
        console.error("❌ INVALID SELECTED LOCATION:", {
          selectedLatitude,
          selectedLongitude,
        });

        return;
      }

      const safeLatitude = Number(Number(selectedLatitude).toFixed(6));

      const safeLongitude = Number(Number(selectedLongitude).toFixed(6));

      const nextPosition = [safeLatitude, safeLongitude];

      console.log("✅ LOCATION SELECTED:", {
        latitude: safeLatitude,
        longitude: safeLongitude,
      });

      // ---------------------------------------------
      // THIS IS NOW THE LOCAL SOURCE OF TRUTH
      // ---------------------------------------------

      setPosition(nextPosition);

      // Clear previous address.
      setLocationDetails(null);

      setLocationError("");

      // Send coordinates to parent.
      sendLocationToParent(safeLatitude, safeLongitude, null);
    },
    [sendLocationToParent],
  );

  // ===================================================
  // EXTERNAL ADDRESS CLICK -> MAP FOCUS
  // ===================================================

  useEffect(() => {
    if (!focusRequest) {
      return;
    }

    const map = mapRef.current;
    const mapContainer = map?.getContainer();

    if (mapContainer) {
      const picker = mapContainer.closest(".custom-location-picker");

      picker?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    if (!map || !position || position.length !== 2) {
      return;
    }

    const nextLatitude = Number(position[0]);

    const nextLongitude = Number(position[1]);

    if (!hasValidCoordinates(nextLatitude, nextLongitude)) {
      return;
    }

    console.log("📍 ADDRESS CLICK -> FOCUSING MAP:", {
      title,
      latitude: nextLatitude,
      longitude: nextLongitude,
    });

    map.stop();
    map.invalidateSize({
      pan: false,
      animate: false,
    });

    map.flyTo([nextLatitude, nextLongitude], SELECTED_LOCATION_ZOOM, {
      animate: true,
      duration: 1.2,
      easeLinearity: 0.25,
    });

    const popupTimers = [
      setTimeout(() => {
        markerRef.current?.openPopup();
      }, 650),
      setTimeout(() => {
        markerRef.current?.openPopup();
      }, 1100),
    ];

    return () => {
      popupTimers.forEach(clearTimeout);
    };
  }, [focusRequest, position, title]);

  // ===================================================
  // REVERSE GEOCODE RESULT
  // ===================================================

  const handleReverseGeocodeResult = useCallback(
    (result) => {
      console.log("✅ ADDRESS RECEIVED:", result);

      setLocationDetails(result);

      setLocationError("");

      sendLocationToParent(result.latitude, result.longitude, result);
    },
    [sendLocationToParent],
  );

  // ===================================================
  // REVERSE GEOCODE LOADING
  // ===================================================

  const handleReverseGeocodeLoading = useCallback((loading) => {
    setLocationLookupLoading(loading);
  }, []);

  // ===================================================
  // REVERSE GEOCODE ERROR
  // ===================================================

  const handleReverseGeocodeError = useCallback((message) => {
    setLocationError(message);
  }, []);

  // ===================================================
  // SYNC EXISTING PARENT COORDINATES
  // ===================================================
  //
  // This is ONLY for an already-existing location.
  //
  // It does NOT clear our local position when
  // the parent is temporarily null.
  // ===================================================

  useEffect(() => {
    if (!hasValidCoordinates(latitude, longitude)) {
      return;
    }

    const nextLatitude = Number(latitude);

    const nextLongitude = Number(longitude);

    const nextPosition = [nextLatitude, nextLongitude];

    console.log("🔄 PARENT LOCATION RECEIVED:", {
      latitude: nextLatitude,
      longitude: nextLongitude,
    });

    setPosition(nextPosition);
  }, [latitude, longitude]);

  // ===================================================
  // CURRENT LOCATION
  // ===================================================

  const handleUseCurrentLocation = useCallback(() => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");

      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (location) => {
        const currentLatitude = Number(location.coords.latitude.toFixed(6));

        const currentLongitude = Number(location.coords.longitude.toFixed(6));

        const nextPosition = [currentLatitude, currentLongitude];

        console.log("📱 CURRENT LOCATION:", {
          latitude: currentLatitude,
          longitude: currentLongitude,
        });

        setPosition(nextPosition);

        setLocationDetails(null);

        setLocationError("");

        sendLocationToParent(currentLatitude, currentLongitude, null);

        setLocationLoading(false);
      },

      (error) => {
        console.error("❌ GEOLOCATION ERROR:", error);

        let message = "Unable to get your current location.";

        if (error.code === 1) {
          message = "Location permission was denied.";
        } else if (error.code === 2) {
          message = "Your location could not be determined.";
        } else if (error.code === 3) {
          message = "Location request timed out.";
        }

        setLocationError(message);

        setLocationLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }, [sendLocationToParent]);

  // ===================================================
  // CLEAR LOCATION
  // ===================================================

  const handleClearLocation = useCallback(() => {
    console.log("🧹 CLEARING LOCATION");

    setPosition(null);

    setLocationDetails(null);

    setLocationError("");

    setLocationLookupLoading(false);

    if (typeof callbackRef.current === "function") {
      callbackRef.current(null, null, null);
    }

    if (mapRef.current) {
      mapRef.current.stop();

      mapRef.current.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, {
        animate: true,
      });
    }
  }, []);

  // ===================================================
  // MARKER DRAG
  // ===================================================

  const handleMarkerDragEnd = useCallback(
    (event) => {
      const marker = event.target;

      const markerPosition = marker.getLatLng();

      const newLatitude = Number(markerPosition.lat.toFixed(6));

      const newLongitude = Number(markerPosition.lng.toFixed(6));

      console.log("📌 MARKER DRAGGED:", {
        latitude: newLatitude,
        longitude: newLongitude,
      });

      const nextPosition = [newLatitude, newLongitude];

      setPosition(nextPosition);

      setLocationDetails(null);

      setLocationError("");

      sendLocationToParent(newLatitude, newLongitude, null);
    },
    [sendLocationToParent],
  );

  // ===================================================
  // MAP READY
  // ===================================================

  const handleMapReady = useCallback(
    (event) => {
      const map = event.target;

      mapRef.current = map;

      console.log("✅ MAP READY");

      console.log("📐 MAP SIZE:", map.getSize());

      console.log("📍 MAP CENTER:", map.getCenter());

      map.invalidateSize({
        pan: false,
        animate: false,
      });

      requestAnimationFrame(() => {
        map.invalidateSize({
          pan: false,
          animate: false,
        });
      });

      setTimeout(() => {
        map.invalidateSize({
          pan: false,
          animate: false,
        });
      }, 150);

      setTimeout(() => {
        map.invalidateSize({
          pan: false,
          animate: false,
        });
      }, 400);

      // Existing saved location.
      if (hasValidCoordinates(latitude, longitude)) {
        const existingPosition = [Number(latitude), Number(longitude)];

        setPosition(existingPosition);

        map.setView(existingPosition, SELECTED_LOCATION_ZOOM, {
          animate: false,
        });
      }
    },
    [latitude, longitude],
  );

  // ===================================================
  // LOCAL POSITION FOR REVERSE GEOCODING
  // ===================================================

  const selectedLatitude = position?.[0] ?? null;

  const selectedLongitude = position?.[1] ?? null;

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div
      className="custom-location-picker"
      style={{
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="custom-location-picker-header">
        <div>
          <h4>{title}</h4>

          <p>
            Click anywhere on the map to select a location. The address will be
            filled automatically.
          </p>
        </div>
      </div>

      {/* =================================================
          MAP
      ================================================= */}

      <div
        className="custom-location-map-wrapper"
        style={{
          position: "relative",
          width: "100%",
          height: "370px",
          minHeight: "370px",
          overflow: "hidden",
          zIndex: 100,
          isolation: "isolate",
        }}
      >
        <MapContainer
          center={DEFAULT_MAP_CENTER}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom={true}
          dragging={true}
          touchZoom={true}
          doubleClickZoom={true}
          keyboard={true}
          className="custom-location-map"
          style={{
            width: "100%",
            height: "100%",
            minHeight: "370px",
          }}
          whenReady={handleMapReady}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            updateWhenZooming={true}
            updateWhenIdle={true}
            keepBuffer={2}
          />

          <MapResizeController />

          {/* IMPORTANT:
              map movement now follows LOCAL position */}
          <MapPositionController position={position} />

          <MapClickController onSelectLocation={handleLocationSelect} />

          {/* IMPORTANT:
              reverse geocoding now follows LOCAL position */}
          <ReverseGeocodeController
            latitude={selectedLatitude}
            longitude={selectedLongitude}
            onResult={handleReverseGeocodeResult}
            onLoading={handleReverseGeocodeLoading}
            onError={handleReverseGeocodeError}
          />

          {position && (
            <Marker
              ref={markerRef}
              position={position}
              draggable={true}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
            >
              <Popup>
                <strong>{title} Location</strong>

                <br />

                {locationLookupLoading ? (
                  "Finding address..."
                ) : locationDetails ? (
                  <>
                    <strong>Address:</strong>

                    <br />

                    {locationDetails.address}

                    <br />
                    <br />

                    {locationDetails.area && (
                      <>
                        <strong>Area:</strong> {locationDetails.area}
                        <br />
                      </>
                    )}

                    {locationDetails.landmark && (
                      <>
                        <strong>Landmark:</strong> {locationDetails.landmark}
                      </>
                    )}
                  </>
                ) : (
                  "Location selected. Address is being found."
                )}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* =================================================
          INSTRUCTION
      ================================================= */}

      <div className="custom-map-instruction">
        Click anywhere on the map to select your location.
      </div>

      {/* =================================================
          LOCATION ACTIONS
      ================================================= */}

      <div className="custom-location-actions">
        <button
          type="button"
          className="custom-location-button"
          onClick={handleUseCurrentLocation}
          disabled={locationLoading}
        >
          {locationLoading ? "Locating..." : "Use My Current Location"}
        </button>

        {position && (
          <button
            type="button"
            className="custom-location-clear-button"
            onClick={handleClearLocation}
          >
            Clear Location
          </button>
        )}
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {locationError && (
        <div className="custom-location-error">{locationError}</div>
      )}

      {/* =================================================
          SELECTED LOCATION
      ================================================= */}

      <div className="custom-location-selected">
        <strong>Selected {title}:</strong>

        {locationLookupLoading && (
          <div className="custom-location-coordinates">Finding address...</div>
        )}

        {position && (
          <div className="custom-location-coordinates">
            <span>Latitude {Number(position[0]).toFixed(6)}</span>

            <span>Longitude {Number(position[1]).toFixed(6)}</span>
          </div>
        )}

        {locationDetails && (
          <div className="custom-location-coordinates">
            <span>
              <strong>Address:</strong> {locationDetails.address}
            </span>

            {locationDetails.area && (
              <span>
                <strong>Area:</strong> {locationDetails.area}
              </span>
            )}

            {locationDetails.landmark && (
              <span>
                <strong>Landmark:</strong> {locationDetails.landmark}
              </span>
            )}
          </div>
        )}

        {!position && !locationLookupLoading && (
          <div className="custom-location-coordinates">
            No location selected yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default Map;
