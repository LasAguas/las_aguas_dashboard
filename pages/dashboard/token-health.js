// pages/token-health.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const PLATFORMS = ["instagram", "tiktok", "youtube"];

const STATUS_LABELS = {
  missing: "Missing",
  ok: "OK",
  error: "Error",
  dismissed: "Dismissed",
};

const STATUS_COLORS = {
  missing: "bg-yellow-100 text-yellow-800",
  ok: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  dismissed: "bg-gray-100 text-gray-600",
};

export default function TokenHealthPage() {
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState([]);
  const [authStatus, setAuthStatus] = useState([]);
  const [savingKey, setSavingKey] = useState(null); // `${artistId}-${platform}`
  const [savingTokenKey, setSavingTokenKey] = useState(null); // `${artistId}-${platform}`
  const [showOldClients, setShowOldClients] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [
        { data: artistsData, error: artistsError },
        { data: statusData, error: statusError },
      ] = await Promise.all([
        supabase
          .from("artists")
          .select(
            "id, name, active_client, instagram_handle, tiktok_handle, youtube_handle"
          )
          .order("name"),
        supabase
          .from("artist_social_auth_status")
          .select(
            "id, artist_id, platform, status, last_checked_at, last_error, access_token"
          ),
      ]);

      if (artistsError) {
        console.error("Error loading artists", artistsError);
      } else {
        setArtists(artistsData || []);
      }

      if (statusError) {
        console.error("Error loading auth status", statusError);
      } else {
        setAuthStatus(statusData || []);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  function getStatus(artistId, platform) {
    return (
      authStatus.find(
        (row) => row.artist_id === artistId && row.platform === platform
      ) || null
    );
  }

  async function updateStatus(artistId, platform, newStatus) {
    const key = `${artistId}-${platform}`;
    setSavingKey(key);

    const now = new Date().toISOString();

    // optimistic UI: update local state first
    setAuthStatus((prev) => {
      const existing = prev.find(
        (row) => row.artist_id === artistId && row.platform === platform
      );
      if (existing) {
        return prev.map((row) =>
          row.artist_id === artistId && row.platform === platform
            ? { ...row, status: newStatus, last_error: null, last_checked_at: now }
            : row
        );
      }
      return [
        ...prev,
        {
          id: null,
          artist_id: artistId,
          platform,
          status: newStatus,
          last_checked_at: now,
          last_error: null,
          access_token: null,
        },
      ];
    });

    const { error } = await supabase.from("artist_social_auth_status").upsert(
      {
        artist_id: artistId,
        platform,
        status: newStatus,
        last_checked_at: now,
      },
      {
        onConflict: "artist_id,platform",
      }
    );

    if (error) {
      console.error("Error updating status", error);
      // optional: reload data here if you want to revert optimistic update
    }

    setSavingKey(null);
  }

  async function updateToken(artistId, platform, newToken) {
    const key = `${artistId}-${platform}`;
    setSavingTokenKey(key);

    const now = new Date().toISOString();

    // optimistic UI
    setAuthStatus((prev) => {
      const existing = prev.find(
        (row) => row.artist_id === artistId && row.platform === platform
      );
      if (existing) {
        return prev.map((row) =>
          row.artist_id === artistId && row.platform === platform
            ? {
                ...row,
                access_token: newToken,
                status: newToken ? "ok" : existing.status, // if token present, assume ok
                last_checked_at: now,
              }
            : row
        );
      }
      return [
        ...prev,
        {
          id: null,
          artist_id: artistId,
          platform,
          status: newToken ? "ok" : "missing",
          last_checked_at: now,
          last_error: null,
          access_token: newToken,
        },
      ];
    });

    const { error } = await supabase.from("artist_social_auth_status").upsert(
      {
        artist_id: artistId,
        platform,
        access_token: newToken,
        status: newToken ? "ok" : "missing",
        last_checked_at: now,
        last_token_updated_at: now,
      },
      {
        onConflict: "artist_id,platform",
      }
    );

    if (error) {
      console.error("Error updating token", error);
      // optional: reload data here if you want to revert optimistic update
    }

    setSavingTokenKey(null);
  }

  function renderTableRows(rows) {
    return rows.map((artist) => (
      <tr key={artist.id} className="border-b align-top">
        <td className="py-2 px-2 font-medium">{artist.name}</td>

        {PLATFORMS.map((platform) => {
          const statusRow = getStatus(artist.id, platform);
          const status = statusRow?.status || "missing";
          const handle =
            artist[`${platform}_handle`] || "(no handle set)";
          const colorClass = STATUS_COLORS[status] || STATUS_COLORS.missing;
          const isSavingStatus = savingKey === `${artist.id}-${platform}`;
          const isSavingToken = savingTokenKey === `${artist.id}-${platform}`;
          const tokenValue = statusRow?.access_token || "";

          return (
            <td key={platform} className="py-2 px-2 space-y-1">
              <div className="text-xs text-gray-600 mb-1">{handle}</div>

              <div className="flex items-center gap-2">
                <div
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
                >
                  {STATUS_LABELS[status] || status}
                </div>
              </div>

              <div className="flex gap-1 mt-1">
                <button
                  className="text-[11px] px-2 py-1 border rounded"
                  onClick={() => updateStatus(artist.id, platform, "ok")}
                  disabled={isSavingStatus || isSavingToken}
                >
                  Mark OK
                </button>
                <button
                  className="text-[11px] px-2 py-1 border rounded"
                  onClick={() =>
                    updateStatus(artist.id, platform, "dismissed")
                  }
                  disabled={isSavingStatus || isSavingToken}
                >
                  Dismiss
                </button>
              </div>

              <div className="mt-2 space-y-1">
                <label className="block text-[11px] text-gray-600">
                  Token
                </label>
                <div className="flex gap-1">
                  <input
                    type="password"
                    className="border rounded px-2 py-1 text-xs flex-1"
                    placeholder="Paste access token"
                    value={tokenValue}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      // update local state only; save on blur / button
                      setAuthStatus((prev) =>
                        prev.map((row) =>
                          row.artist_id === artist.id &&
                          row.platform === platform
                            ? { ...row, access_token: newVal }
                            : row
                        )
                      );
                    }}
                    onBlur={async (e) => {
                      // auto-save on blur
                      await updateToken(
                        artist.id,
                        platform,
                        e.target.value.trim()
                      );
                    }}
                  />
                  <button
                    className="text-[11px] px-2 py-1 border rounded whitespace-nowrap"
                    onClick={() =>
                      updateToken(artist.id, platform, tokenValue.trim())
                    }
                    disabled={isSavingToken}
                  >
                    {isSavingToken ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {statusRow?.last_error && (
                <div className="text-[11px] text-red-600 mt-1">
                  {statusRow.last_error}
                </div>
              )}
            </td>
          );
        })}
      </tr>
    ));
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">
          Token & Permission Health
        </h1>
        <p>Loading…</p>
      </div>
    );
  }

  const activeArtists = artists.filter((a) => a.active_client);
  const inactiveArtists = artists.filter((a) => !a.active_client);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">
          Token & Permission Health
        </h1>
        <p className="text-sm text-gray-600">
          See which artist accounts still need API access set up. This will
          drive the “todo list” for reconnecting or dismissing accounts when
          clients churn.
        </p>
      </div>

      {/* Active clients */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Active clients</h2>
        <div
            className="overflow-x-auto border rounded-md"
            style={{ backgroundColor: "#a89ee4" }}
            >
            <table className="min-w-full text-sm">
                <thead>
                <tr className="border-b">
                    <th className="text-left py-2 px-2 text-black">Artist</th>
                    <th className="text-left py-2 px-2 text-black">Instagram</th>
                    <th className="text-left py-2 px-2 text-black">TikTok</th>
                    <th className="text-left py-2 px-2 text-black">YouTube</th>
                </tr>
                </thead>
                <tbody>{renderTableRows(activeArtists)}</tbody>
            </table>
            </div>

      </div>

      {/* Old clients (inactive) */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center justify-between w-full border rounded-md px-3 py-2 text-left bg-gray-50 hover:bg-gray-100"
          onClick={() => setShowOldClients((prev) => !prev)}
        >
          <span className="font-semibold">
            Old clients ({inactiveArtists.length})
          </span>
          <span className="text-xs text-gray-600">
            {showOldClients ? "Hide" : "Show"}
          </span>
        </button>

        {showOldClients && inactiveArtists.length > 0 && (
          <div
          className="overflow-x-auto border rounded-md mt-2"
          style={{ backgroundColor: "#a89ee4" }}
        >
            <table className="min-w-full text-sm">
              <thead>
                <tr
                  className="border-b"
                  style={{ backgroundColor: "#a89ee4" }}
                >
                  <th className="text-left py-2 px-2 text-white">
                    Artist
                  </th>
                  <th className="text-left py-2 px-2 text-white">
                    Instagram
                  </th>
                  <th className="text-left py-2 px-2 text-white">
                    TikTok
                  </th>
                  <th className="text-left py-2 px-2 text-white">
                    YouTube
                  </th>
                </tr>
              </thead>
              <tbody>{renderTableRows(inactiveArtists)}</tbody>
            </table>
          </div>
        )}

        {showOldClients && inactiveArtists.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            No inactive artists yet.
          </p>
        )}
      </div>
    </div>
  );
}
