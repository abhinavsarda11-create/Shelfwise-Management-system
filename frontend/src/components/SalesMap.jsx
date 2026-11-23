import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { money } from '../format';

export default function SalesMap({ points }) {
  const el = useRef(null);

  useEffect(() => {
    const map = L.map(el.current, { scrollWheelZoom: false }).setView([22.8, 79.5], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 12,
    }).addTo(map);

    const peak = Math.max(...points.map((p) => p.revenue), 1);
    const group = L.featureGroup();
    points.forEach((p) => {
      const box = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${p.city}, ${p.state}`;
      const line = document.createElement('div');
      line.textContent = `${money(p.revenue)} from ${p.orders} orders`;
      box.append(title, line);
      L.circleMarker([p.lat, p.lng], {
        radius: 6 + 26 * Math.sqrt(p.revenue / peak),
        color: '#FBE4D8',
        weight: 1,
        fillColor: '#DFB6B2',
        fillOpacity: 0.45,
      }).bindPopup(box).addTo(group);
    });
    group.addTo(map);
    if (points.length) map.fitBounds(group.getBounds().pad(0.15), { maxZoom: 7 });
    const timer = setTimeout(() => map.invalidateSize(), 350);
    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, [points]);

  return <div className="map" ref={el} />;
}
