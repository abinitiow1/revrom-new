import React, { useEffect, useRef } from 'react';
import type { Theme } from '../App';

// Declare Leaflet's global variable to TypeScript
declare const L: any;

interface TripRouteMapProps {
  coordinates: [number, number][];
  theme: Theme;
}

const tileLayers = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }
};

const TripRouteMap: React.FC<TripRouteMapProps> = ({ coordinates, theme }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null); // To hold the map instance
  const routeLayerRef = useRef<any>(null); // To hold the route layers
  const tileLayerRef = useRef<any>(null); // To hold the tile layer

  useEffect(() => {
    // Ensure Leaflet is loaded and the container is ready
    if (typeof L === 'undefined' || !mapContainer.current) {
      console.error("Leaflet not loaded or map container not found.");
      return;
    }

    // Initialize map only once
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainer.current);
    }

    const map = mapRef.current;

    // Update tile layer based on theme
    const currentTileLayer = tileLayers[theme];
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(currentTileLayer.url, {
      attribution: currentTileLayer.attribution
    }).addTo(map);

    // Clear previous route layers before drawing a new one
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
    }

    if (coordinates && coordinates.length > 0) {
      // Create a new layer group to hold the polyline and markers
      const routeLayer = L.layerGroup().addTo(map);
      routeLayerRef.current = routeLayer;

      const polyline = L.polyline(coordinates, { color: '#DD6B20', weight: 4 }).addTo(routeLayer);
      
      // Fit map bounds to the new polyline
      map.fitBounds(polyline.getBounds().pad(0.1));

      // Add start marker
      L.marker(coordinates[0]).addTo(routeLayer)
        .bindPopup('<b>Start</b>')
        .openPopup();
      
      // Add end marker
      if (coordinates.length > 1) {
        L.marker(coordinates[coordinates.length - 1]).addTo(routeLayer)
          .bindPopup('<b>End</b>');
      }
    }
  }, [coordinates, theme]); // Re-run effect if coordinates or theme change

  return <div ref={mapContainer} style={{ height: '450px', width: '100%', borderRadius: '8px', zIndex: 0 }} />;
};

export default TripRouteMap;