// pages/stats-view.js
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

// --- Supabase client ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// --- Platform labels/colors ---
const PLATFORM_LABELS = {
  spotify: "Spotify",
  apple: "Apple Music",
  tidal: "Tidal",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  bandcamp: "Bandcamp",
};

const PLATFORM_COLORS = {
  Spotify: "#1DB954",
  "Apple Music": "#FA57C1",
  Tidal: "#000000",
  YouTube: "#FF0000",
  Instagram: "#C13584",
  TikTok: "#69C9D0",
  Facebook: "#1877F2",
  Bandcamp: "#629AA9",
};

// --- Helpers ---
const toNum = (v) => (v === null || v === undefined ? null : Number(v));
const toDateKey = (d) => {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return d;
  }
};
const nicePlatform = (key) => PLATFORM_LABELS[key] || key;

// utils/date.js or inside stats-view.js
export function formatDDMMYYYY(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0"); // months 0-indexed
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}


// --- Build chart data ---
function buildChartData(snapshots, metric) {
  const rowsByDate = new Map();
  const platformsSeen = new Set();

  const resolvers = {
    listeners: (m) => toNum(m?.listeners),
    streams: (m) => toNum(m?.streams ?? m?.plays),
    followers: (m) => toNum(m?.followers),
    engagement_rate: (m) =>
      toNum(m?.engagement_rate ?? m?.engagement ?? m?.ctr),
  };
  const resolve = resolvers[metric] || ((m) => null);

  snapshots.forEach((s) => {
    const dateKey = toDateKey(s.snapshot_date);
    const label = nicePlatform(s.platform);
    const value = resolve(s.metrics || {});
    if (value === null) return;

    platformsSeen.add(label);

    if (!rowsByDate.has(dateKey)) rowsByDate.set(dateKey, { date: dateKey });
    rowsByDate.get(dateKey)[label] = value;
  });

  const data = Array.from(rowsByDate.values()).sort((a, b) =>
    a.date < b.date ? -1 : 1
  );

  const seriesKeys = Array.from(platformsSeen);
  data.forEach((row) => {
    seriesKeys.forEach((k) => {
      if (!(k in row)) row[k] = null;
    });
  });

  return { data, seriesKeys };
}

// --- Follower growth delta ---
function buildFollowerGrowthData(snapshots) {
  const byPlatform = new Map();
  snapshots.forEach((s) => {
    const label = nicePlatform(s.platform);
    const followers = toNum(s.metrics?.followers);
    if (followers === null) return;
    if (!byPlatform.has(label)) byPlatform.set(label, []);
    byPlatform.get(label).push({ date: toDateKey(s.snapshot_date), value: followers });
  });

  const dateMap = new Map();
  for (const [label, arr] of byPlatform) {
    arr.sort((a, b) => (a.date < b.date ? -1 : 1));
    let prev = null;
    arr.forEach((pt) => {
      const delta = prev === null ? null : pt.value - prev.value;
      prev = pt;
      if (!dateMap.has(pt.date)) dateMap.set(pt.date, { date: pt.date });
      dateMap.get(pt.date)[label] = delta;
    });
  }

  const data = Array.from(dateMap.values()).sort((a, b) =>
    a.date < b.date ? -1 : 1
  );
  const seriesKeys = Array.from(byPlatform.keys());
  data.forEach((row) => {
    seriesKeys.forEach((k) => {
      if (!(k in row)) row[k] = null;
    });
  });
  return { data, seriesKeys };
}

// --- Chart card ---
function ChartCard({ title, subtitle, chart, isClient }) {
  return (
    <div className="bg-white shadow rounded-2xl p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="h-72">
        {isClient ? chart : <div className="text-sm text-gray-500">Loading…</div>}
      </div>
    </div>
  );
}

// --- Metric line chart ---
function MetricLineChart({ data, seriesKeys }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals />
        <Tooltip />
        <Legend />
        {seriesKeys.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={PLATFORM_COLORS[key] || "#666"}
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// --- Main Page ---
export default function StatsView() {
  const [artists, setArtists] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // --- Client flag for hydration fix ---
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- Load artists ---
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("artists")
          .select("id,name")
          .order("name");
        if (error) throw error;
        setArtists(data || []);
        if (data && data.length && !selectedArtistId) setSelectedArtistId(String(data[0].id));
      } catch (e) {
        console.error(e);
        setErr("Error loading artists. Check console.");
      }
    };
    load();
  }, []);

  // --- Load snapshots ---
  useEffect(() => {
    if (!selectedArtistId) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("artist_stats_snapshots")
          .select("id, platform, snapshot_date, snapshot_start, snapshot_end, metrics")
          .eq("artist_id", Number(selectedArtistId))
          .order("snapshot_date", { ascending: true });
        if (error) throw error;
        setSnapshots(data || []);
      } catch (e) {
        console.error(e);
        setErr("Error loading snapshots. Check console.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedArtistId]);

  // --- Primary chart datasets ---
  const listenersData = useMemo(
    () => buildChartData(snapshots.filter(s => ["spotify","apple","tidal"].includes(s.platform)), "listeners"),
    [snapshots]
  );
  const streamsData = useMemo(
    () => buildChartData(snapshots.filter(s => ["spotify","apple","tidal"].includes(s.platform)), "streams"),
    [snapshots]
  );
  const followersData = useMemo(
    () => buildChartData(snapshots, "followers"),
    [snapshots]
  );
  const followerGrowthData = useMemo(
    () => buildFollowerGrowthData(snapshots),
    [snapshots]
  );

  return (
    <div className="p-6 space-y-6">
      <Link href="/">
        <button className="absolute top-4 right-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-md">
          View Calendar
        </button>
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stats Dashboard</h1>
      </div>

      {/* Artist selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Artist</label>
        <select
          className="border rounded-md p-2"
          value={selectedArtistId}
          onChange={(e) => setSelectedArtistId(e.target.value)}
        >
          {artists.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>

      {/* Primary graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Listeners (Stacked by Platform)"
          subtitle="DSP: Spotify / Apple Music / Tidal"
          chart={<MetricLineChart data={listenersData.data} seriesKeys={listenersData.seriesKeys} />}
          isClient={isClient}
        />
        <ChartCard
          title="Streams / Plays"
          subtitle="Unifies Spotify Streams + Apple Plays"
          chart={<MetricLineChart data={streamsData.data} seriesKeys={streamsData.seriesKeys} />}
          isClient={isClient}
        />
        <ChartCard
          title="Followers"
          subtitle="DSP + Social where available"
          chart={<MetricLineChart data={followersData.data} seriesKeys={followersData.seriesKeys} />}
          isClient={isClient}
        />
        <ChartCard
          title="Follower Growth (Δ)"
          subtitle="Derived from Followers"
          chart={<MetricLineChart data={followerGrowthData.data} seriesKeys={followerGrowthData.seriesKeys} />}
          isClient={isClient}
        />
      </div>

      {/* Secondary: raw snapshots */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Snapshot Details</h2>
        {snapshots.length === 0 ? (
          <p className="text-sm text-gray-500">No snapshots found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {snapshots.map((snap) => (
              <div key={snap.id} className="bg-white shadow rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{nicePlatform(snap.platform)}</span>
                  <span className="text-xs text-gray-500">
                    {toDateKey(snap.snapshot_start)} → {toDateKey(snap.snapshot_end)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  Snapshot: {toDateKey(snap.snapshot_date)}
                </div>
                <pre className="text-xs overflow-auto max-h-40 bg-gray-50 p-2 rounded">
                  {JSON.stringify(snap.metrics, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
