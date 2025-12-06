"use client";

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const conditionColors = {
  1: '#22c55e',
  2: '#3b82f6',
  3: '#facc15',
  4: '#fb923c',
  5: '#ef4444',
};

const MapFocus = ({ selected }) => {
  const map = useMap();
  useEffect(() => {
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], 6, { duration: 0.7 });
    }
  }, [selected, map]);
  return null;
};

export default function MapView({ objects, selectedObject, onSelect }) {
  const center = useMemo(() => {
    if (selectedObject) return [selectedObject.latitude, selectedObject.longitude];
    return [47, 70];
  }, [selectedObject]);

  return (
    <MapContainer
      center={center}
      zoom={5}
      minZoom={4}
      maxZoom={12}
      scrollWheelZoom
      className="h-full w-full"
      zoomControl
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapFocus selected={selectedObject} />
      {objects.map((obj) => (
        <CircleMarker
          key={obj.id}
          center={[obj.latitude, obj.longitude]}
          radius={10}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: conditionColors[obj.technical_condition] || '#94a3b8',
            fillOpacity: 0.9,
          }}
          eventHandlers={{
            click: () => onSelect(obj),
          }}
        >
          <Tooltip direction="top" offset={[0, -2]} opacity={1}>
            <div className="space-y-1">
              <div className="font-semibold text-sm">{obj.name}</div>
              <div className="text-xs text-gray-700">{obj.region}</div>
              <div className="text-xs">
                Приоритет:{' '}
                <span className="font-semibold">
                  {obj.priorityLabel} ({obj.technical_condition} кат.)
                </span>
              </div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
