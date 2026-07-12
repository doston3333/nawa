"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileSummary } from "@/server/profile";

type ProfilePickerProps = {
  initialProfiles: ProfileSummary[];
};

export function ProfilePicker({ initialProfiles }: ProfilePickerProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select(profileId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/profile/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to select profile");
      try {
        window.localStorage.setItem("nawa_active_profile_id", profileId);
      } catch {
        // Some test/embedded environments disable browser storage. The
        // httpOnly profile cookie remains authoritative in that case.
      }
      router.push("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to select profile");
      setBusy(false);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name to create a profile.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = (await response.json()) as ProfileSummary & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to create profile");
      setProfiles((current) => [...current, { id: body.id, name: body.name }]);
      setName("");
      await select(body.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create profile");
      setBusy(false);
    }
  }

  return (
    <main className="profile-shell">
      <div className="profile-card">
        <p className="study-room-status-kicker">Nawa · private study space</p>
        <h1>Who is studying?</h1>
        <p className="profile-lede">
          Choose your profile to open your own reading, writing, notebooks, and progress.
        </p>

        <div className="profile-list" aria-label="Profiles">
          {profiles.map((profile) => (
            <button
              className="profile-choice"
              key={profile.id}
              type="button"
              onClick={() => void select(profile.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void select(profile.id);
                }
              }}
              disabled={busy}
            >
              {profile.name}
            </button>
          ))}
        </div>

        <form className="profile-create" onSubmit={create}>
          <label htmlFor="profile-name">Create a profile</label>
          <div className="profile-create-row">
            <input
              id="profile-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Your name"
              autoComplete="off"
              disabled={busy}
            />
            <button className="primary-action" type="submit" disabled={busy}>
              Create profile
            </button>
          </div>
        </form>

        <p className="profile-privacy">
          Profiles are separate notebooks and progress. No password is required; this is a private app.
        </p>
        {error ? (
          <p className="profile-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
