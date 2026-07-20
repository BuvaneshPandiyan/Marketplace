"use client";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { fuzzCoordinate } from "@/lib/client/fuzzCoordinate";

type MapPreviewProps = { lat: number; lng: number; listingId: string };

export function MapPreview({ lat, lng, listingId }: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if (!containerRef.current) return;

    async function initMap() {
      const L = (await import("leaflet")).default;
      if (!containerRef.current) return;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

      const fuzzed = fuzzCoordinate(lat, lng, listingId);

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        // Use custom zoom controls styled below
        zoomControl: false,
      }).setView([fuzzed.lat, fuzzed.lng], 14);

      // CartoDB Positron — cleaner, more modern than default OSM tiles
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" style="font-size:10px;opacity:0.6">OSM</a> &copy; <a href="https://carto.com/attributions" style="font-size:10px;opacity:0.6">CARTO</a>',
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      // Custom SVG pin matching the app's location pin icon in brand orange
      const pinIcon = L.divIcon({
        html: `<div style="width:36px;height:44px;display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.22))">
          <div style="width:36px;height:36px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#9333a8">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <div style="width:2px;height:8px;background:#9333a8;border-radius:2px;margin-top:1px"></div>
        </div>`,
        className: "",
        iconSize: [36, 44],
        iconAnchor: [18, 44],
      });

      L.marker([fuzzed.lat, fuzzed.lng], { icon: pinIcon }).addTo(map);

      // Softer privacy radius circle
      L.circle([fuzzed.lat, fuzzed.lng], {
        radius: 150,
        color: "#9333a8",
        fillColor: "#9333a8",
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: "4 4",
      }).addTo(map);

      // Custom zoom controls — styled to match app's pill/rounded language
      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);

      // Fix: ResizeObserver calls invalidateSize() whenever the container dimensions
      // change — this handles the Leaflet blank-map bug caused by the grid layout
      // not having finished sizing when L.map() first initialized.
      if (containerRef.current) {
        const ro = new ResizeObserver(() => {
          mapInstanceRef.current?.invalidateSize();
        });
        ro.observe(containerRef.current);
      }
    }

    initMap();
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, [lat, lng, listingId]);

  return (
    <div style={{ position: "relative", height: 256, borderRadius: 16, overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", isolation: "isolate", zIndex: 0 }}>

      {/* Loading skeleton — absolutely positioned so it overlaps the map container, not stacks with it */}
      {!mapReady && (
        <div
          className="animate-pulse"
          style={{ position: "absolute", inset: 0, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e5e7eb" }} />
        </div>
      )}

      {/* Map container — absolutely positioned, same footprint, fades in when ready */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: mapReady ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      />

      {/* Privacy caption — overlaid pill in the corner */}
      {mapReady && (
        <div style={{
          position: "absolute", bottom: 10, left: 10,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(8px)",
          borderRadius: 100,
          padding: "4px 10px",
          fontSize: 11, color: "#6b7280",
          display: "flex", alignItems: "center", gap: 5,
          pointerEvents: "none",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Approximate location
        </div>
      )}

      {/* Custom zoom button styles */}
      <style>{`
        .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 12px rgba(0,0,0,0.12) !important; border-radius: 10px !important; overflow: hidden; }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          width: 32px !important; height: 32px !important; line-height: 32px !important;
          font-size: 16px !important; background: white !important; color: #374151 !important;
          border: none !important; border-bottom: 1px solid #f3f4f6 !important;
          transition: background 150ms ease, color 150ms ease !important;
        }
        .leaflet-control-zoom-out { border-bottom: none !important; }
        .leaflet-control-zoom-in:hover, .leaflet-control-zoom-out:hover { background: #faf5ff !important; color: #9333a8 !important; }
        .leaflet-attribution-flag { display: none !important; }
      `}</style>
    </div>
  );
}