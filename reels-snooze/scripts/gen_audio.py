"""Original, royalty-free soundtrack for the Reels short (all synthesized).

Tempo 150 BPM -> 1 beat = 0.4 s, 1 bar = 1.6 s; every cut lands on a bar line.

  0.0 - 1.6   ringtone (hook)                 music/ringtone.wav
  1.6 - 11.2  sleepy groove, one layer per alarm  music/groove.wav
 11.2 - 12.35 silence (snot bubble, clock ticks)
 12.35        stinger                         music/stinger.wav
 12.8 - 16.0  panic run                       music/panic.wav
 16.0         record scratch                  sfx/record_scratch.wav
 18.4 - 22.4  weekend lo-fi                   music/lofi.wav
 22.4 - 24.0  ringtone again -> loops to the start

Usage:  python scripts/gen_audio.py      (from the reels-snooze folder)
"""

from __future__ import annotations

import soundfile as sf
from synth import (  # noqa: F401  (re-exported helpers)
    MUSIC,
    SFX,
    SR,
    bell,
    birds,
    boing,
    bp,
    brass_note,
    clap,
    env,
    footstep,
    grains,
    hat,
    hp,
    hz,
    kick,
    lp,
    marimba,
    master,
    noise,
    np,
    place,
    pop,
    rng,
    rustle,
    save,
    snare,
    sparkle,
    sweep,
    t_axis,
    thud,
)

BPM = 150
BEAT = 60 / BPM  # 0.4 s
BAR = BEAT * 4  # 1.6 s


# ----------------------------------------------------------------- instruments
def epiano(freq: float, dur: float, vel: float = 1.0) -> np.ndarray:
    """Rhodes-like electric piano: soft fundamental + bell tine + tremolo."""
    t = t_axis(dur)
    n = len(t)
    x = np.sin(2 * np.pi * freq * t) + 0.18 * np.sin(2 * np.pi * freq * 2 * t)
    tine = 0.25 * np.sin(2 * np.pi * freq * 7.1 * t) * env(n, 0.001, 0.05)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.8 * t)
    return (x * env(n, 0.004, dur * 0.55) + tine) * trem * vel


def chord(notes: list[str], dur: float, vel: float = 1.0, inst=epiano) -> np.ndarray:
    out = np.zeros(int((dur + 0.05) * SR))
    for k, nm in enumerate(notes):
        place(out, inst(hz(nm), dur, vel), k * 0.008)
    return out / max(1, len(notes)) * 2


def pad_tone(freq: float, dur: float, vel: float = 1.0) -> np.ndarray:
    """Soft sustained pad (slow attack, gentle release)."""
    t = t_axis(dur)
    x = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2.003 * t)
    a = np.clip(t / 0.18, 0, 1) * np.clip((dur - t) / 0.25, 0, 1)
    return x * a * vel


def round_bass(freq: float, dur: float) -> np.ndarray:
    t = t_axis(dur)
    ph = 2 * np.pi * freq * t
    x = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
    return lp(x, 900) * env(len(t), 0.006, dur * 0.7)


def square_lead(freq: float, dur: float) -> np.ndarray:
    t = t_axis(dur)
    x = sum(np.sin(2 * np.pi * freq * k * t) / k for k in range(1, 12, 2))
    return lp(x, 3500) * env(len(t), 0.003, dur * 0.6)


def crash(dur: float = 1.2) -> np.ndarray:
    return hp(noise(dur), 4500) * env(int(dur * SR), 0.002, dur * 0.35)


def timpani(freq: float, dur: float = 1.0) -> np.ndarray:
    t = t_axis(dur)
    f = freq * (1 + 0.15 * np.exp(-t * 20))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * lp(noise(dur), 300)
    return x * env(len(t), 0.002, 0.35)


def vinyl(dur: float) -> np.ndarray:
    return grains(dur, int(dur * 25), 1500, 6000) * 0.25 + hp(noise(dur), 3000) * 0.01


# ----------------------------------------------------------------- music cues
RING = [("D6", 1), ("A5", 1), ("F#5", 1), ("A5", 1), ("D6", 1), ("E6", 1), ("F#6", 1), ("A5", 1)]


def ringtone(bars: int = 1) -> np.ndarray:
    """Original marimba alarm melody (8 eighth notes per bar)."""
    out = np.zeros(int(bars * BAR * SR) + int(0.4 * SR))
    for b in range(bars):
        for i, (nm, _) in enumerate(RING):
            at = b * BAR + i * BEAT / 2
            place(out, marimba(hz(nm), 0.3), at, 0.8)
            place(out, bell(hz(nm) * 2, 0.25), at, 0.12)
    return out[: int(bars * BAR * SR)]


def phone_speaker(x: np.ndarray) -> np.ndarray:
    """The same ringtone as heard from a tiny phone speaker in the room."""
    return np.tanh(bp(x, 700, 5000) * 2.5) * 0.6


GROOVE_CHORDS = [
    ["F3", "A3", "C4", "E4"],
    ["E3", "G3", "B3", "D4"],
    ["D3", "F3", "A3", "C4"],
    ["C3", "E3", "G3", "B3"],
    ["A#2", "D3", "F3", "A3"],
    ["C3", "E3", "G3", "A#3"],
]
GROOVE_ROOTS = ["F2", "E2", "D2", "C2", "A#1", "C2"]


def groove() -> np.ndarray:
    """6 bars; each bar adds a layer as the alarms escalate."""
    bars = len(GROOVE_CHORDS)
    L = np.zeros(int(bars * BAR * SR) + SR)
    R = np.zeros_like(L)
    swing = 0.035
    for b in range(bars):
        t0 = b * BAR
        ch = GROOVE_CHORDS[b]
        # sustained pad under the whole bar (no dead air)
        pd = lp(chord(ch, BAR + 0.1, 0.35, inst=pad_tone), 1400)
        place(L, pd, t0, 0.4)
        place(R, pd, t0, 0.4)
        # keys: long chord on 1, short stabs on the "and" of 2 and 4
        for pos, dur, vel in [(0, BEAT * 1.6, 0.9), (1.5, BEAT * 0.5, 0.55), (3.5, BEAT * 0.5, 0.55)]:
            at = t0 + pos * BEAT + (swing if pos % 1 else 0)
            c = chord(ch, dur, vel)
            place(L, c, at, 0.5)
            place(R, c, at + 0.006, 0.42)
        if b >= 1:  # bass from bar 2
            root = hz(GROOVE_ROOTS[b])
            for pos, mul, dur in [(0, 1, 0.9), (1.5, 1, 0.3), (2, 1.5, 0.7), (3.5, 2, 0.3)]:
                bn = round_bass(root * mul, BEAT * dur * 1.6)
                place(L, bn, t0 + pos * BEAT + (swing if pos % 1 else 0), 0.55)
                place(R, bn, t0 + pos * BEAT + (swing if pos % 1 else 0), 0.55)
        # drums
        kicks = [0] if b == 0 else [0, 2, 2.75] if b >= 2 else [0, 2]
        for k in kicks:
            place(L, kick(), t0 + k * BEAT, 0.5)
            place(R, kick(), t0 + k * BEAT, 0.5)
        if b >= 2:
            for k in (1, 3):
                place(L, snare(), t0 + k * BEAT, 0.28)
                place(R, clap(), t0 + k * BEAT, 0.22)
            for h in range(8):
                place(R, hat(), t0 + h * BEAT / 2 + (swing if h % 2 else 0), 0.1 if h % 2 else 0.14)
        if b >= 3:  # extra percussion from the giant clock onwards
            for h in range(16):
                place(L, hat(), t0 + h * BEAT / 4, 0.05)
        if b == 4:  # brass stabs for the rooster
            for k in (0, 1.5):
                for nm in ["A#3", "D4", "F4"]:
                    st = brass_note(hz(nm), 0.25)
                    place(L, st, t0 + k * BEAT, 0.12)
                    place(R, st, t0 + k * BEAT, 0.12)
    # final bar: snare roll crescendo into silence
    t0 = (bars - 1) * BAR
    for i in range(8):
        place(L, snare(), t0 + 2 * BEAT + i * BEAT / 4, 0.12 + i * 0.03)
        place(R, snare(), t0 + 2 * BEAT + i * BEAT / 4, 0.12 + i * 0.03)
    riser = bp(noise(BAR), 800, 8000) * np.linspace(0, 1, int(BAR * SR)) ** 2 * 0.25
    place(L, riser, t0)
    place(R, riser, t0)
    out = np.stack([L, R], axis=1)[: int(bars * BAR * SR)]
    out[-int(0.012 * SR) :] *= np.linspace(1, 0, int(0.012 * SR))[:, None]  # hard stop
    return out


def stinger() -> np.ndarray:
    out = np.zeros(int(1.6 * SR))
    for nm in ["D3", "F3", "A3", "D4"]:
        place(out, brass_note(hz(nm), 1.2), 0, 0.5)
    place(out, timpani(hz("D2"), 1.4), 0, 1.0)
    place(out, crash(1.4), 0, 0.5)
    return lp(out, 6000)


def panic() -> np.ndarray:
    """2 bars of frantic double-time chase."""
    bars = 2
    L = np.zeros(int(bars * BAR * SR) + SR)
    R = np.zeros_like(L)
    riff = ["D5", "D5", "F5", "D5", "G5", "D5", "A5", "G5", "F5", "D5", "C5", "D5", "F5", "E5", "D5", "C#5"]
    for b in range(bars):
        t0 = b * BAR
        for k in range(4):
            place(L, kick(), t0 + k * BEAT, 0.6)
            place(R, kick(), t0 + k * BEAT, 0.6)
            if k % 2 == 1:
                place(L, snare(), t0 + k * BEAT, 0.4)
                place(R, snare(), t0 + k * BEAT, 0.4)
        for h in range(16):
            place(R, hat(), t0 + h * BEAT / 4, 0.12)
            nm = riff[h]
            if b == 1:
                nm = nm[:-1] + str(int(nm[-1]) + (1 if h >= 8 else 0))
            sl = square_lead(hz(nm), BEAT / 4 * 0.9)
            place(L, sl, t0 + h * BEAT / 4, 0.14)
            place(R, sl, t0 + h * BEAT / 4 + 0.004, 0.12)
        for k, nm in enumerate(["D2", "D2", "F2", "G2"] if b == 0 else ["A#1", "A#1", "A1", "A1"]):
            bn = round_bass(hz(nm), BEAT * 0.9)
            place(L, bn, t0 + k * BEAT, 0.6)
            place(R, bn, t0 + k * BEAT, 0.6)
    # siren wobble on top
    t = t_axis(bars * BAR)
    f = 850 + 250 * np.sin(2 * np.pi * 2.5 * t)
    siren = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.05
    place(L, siren, 0)
    place(R, siren, 0)
    return np.stack([L, R], axis=1)[: int(bars * BAR * SR)]


def lofi() -> np.ndarray:
    """Weekend mood: mellow keys, lazy half-time beat, vinyl crackle (4 s)."""
    dur = 4.0
    L = np.zeros(int(dur * SR) + SR)
    R = np.zeros_like(L)
    prog = [(["F3", "A3", "C4", "E4", "G4"], 0.0, 1.6), (["E3", "G3", "B3", "D4"], 1.6, 1.6), (["D3", "F3", "A3", "C4", "E4"], 3.2, 0.8)]
    for notes, at, d in prog:
        c = lp(chord(notes, d + 0.6, 0.8), 2300)
        place(L, c, at, 0.55)
        place(R, c, at + 0.01, 0.5)
        root = hz(notes[0]) / 2
        place(L, round_bass(root, d), at, 0.45)
        place(R, round_bass(root, d), at, 0.45)
    for b in range(3):
        t0 = b * BAR
        place(L, kick(), t0, 0.35)
        place(R, kick(), t0, 0.35)
        if b < 2:
            place(L, lp(snare(), 3000), t0 + 2 * BEAT, 0.18)
            place(R, lp(snare(), 3000), t0 + 2 * BEAT, 0.18)
            for h in range(4):
                place(R, lp(hat(), 6000), t0 + h * BEAT + BEAT / 2, 0.06)
    out = np.stack([L, R], axis=1)[: int(dur * SR)]
    cr = vinyl(dur)
    out += np.stack([cr, cr], axis=1)
    # gentle tape wobble
    t = t_axis(dur)
    out *= (1 + 0.04 * np.sin(2 * np.pi * 0.7 * t))[:, None]
    out[-int(0.6 * SR) :] *= np.linspace(1, 0, int(0.6 * SR))[:, None]
    return out


# ----------------------------------------------------------------- sound effects
def phone_buzz(dur: float = 1.6) -> np.ndarray:
    t = t_axis(dur)
    gate = ((t % 0.8) < 0.38).astype(float)
    gate = lp(gate, 40)
    buzz = np.sign(np.sin(2 * np.pi * 172 * t)) * 0.5 + np.sin(2 * np.pi * 344 * t) * 0.3
    rattle = bp(noise(dur), 900, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 172 * t)) * 0.4
    return lp(buzz + rattle, 2500) * gate


def bell_ring(dur: float, f0: float, rate: float, decay: float) -> np.ndarray:
    """Twin-bell alarm clock: a hammer alternating between two bells."""
    out = np.zeros(int(dur * SR) + SR)
    ratios = [1.0, 2.32, 4.25, 6.63]
    k = 0
    at = 0.0
    while at < dur:
        f = f0 * (1.0 if k % 2 == 0 else 1.065)
        tt = t_axis(decay * 3)
        strike = sum(np.sin(2 * np.pi * f * r * tt) / (1 + i) for i, r in enumerate(ratios))
        place(out, strike * env(len(tt), 0.0005, decay), at, 0.6)
        at += 1 / rate
        k += 1
    return out[: int(dur * SR)]


def slap() -> np.ndarray:
    d = 0.25
    n = int(d * SR)
    return bp(noise(d), 900, 6000) * env(n, 0.0005, 0.012) + np.sin(2 * np.pi * 120 * t_axis(d)) * env(n, 0.001, 0.04)


def soft_thump() -> np.ndarray:
    d = 0.4
    n = int(d * SR)
    return lp(noise(d), 350) * env(n, 0.004, 0.08) * 2 + bp(noise(d), 300, 2000) * env(n, 0.02, 0.12) * 0.4


def huge_thud() -> np.ndarray:
    d = 1.4
    n = int(d * SR)
    body = sweep(90, 28, d) * env(n, 0.002, 0.45)
    low = lp(noise(d), 160) * env(n, 0.001, 0.2) * 3
    crack = bp(noise(d), 900, 3500) * env(n, 0.0005, 0.03)
    return body * 1.2 + low * 0.7 + crack * 0.6


def snore(dur: float = 1.6) -> np.ndarray:
    """Cartoon snore: growly inhale (드르렁) + whistling exhale (푸우~)."""
    out = np.zeros(int(dur * SR))
    tin = t_axis(0.85)
    growl = bp(noise(0.85), 70, 500) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 28 * tin)))
    growl *= np.clip(tin / 0.6, 0, 1) * np.clip((0.85 - tin) / 0.1, 0, 1)
    place(out, growl * 1.4, 0.0)
    tex = t_axis(0.6)
    whistle = sweep(1250, 780, 0.6) * env(len(tex), 0.05, 0.35) * 0.35 + bp(noise(0.6), 800, 2500) * env(len(tex), 0.03, 0.2) * 0.3
    place(out, whistle, 0.95)
    return out


def wing_flap(dur: float = 0.9) -> np.ndarray:
    t = t_axis(dur)
    gate = np.clip(np.sin(2 * np.pi * 13 * t), 0, 1) ** 2
    return bp(noise(dur), 250, 2200) * gate * env(len(t), 0.05, dur * 0.6)


def bubble_inflate() -> np.ndarray:
    d = 0.5
    t = t_axis(d)
    f = 380 * (3.6 ** (t / d)) * (1 + 0.03 * np.sin(2 * np.pi * 23 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.clip(t / 0.05, 0, 1) * 0.7


def bubble_pop() -> np.ndarray:
    p = pop() * 0.8
    click = bp(noise(0.06), 1500, 8000) * env(int(0.06 * SR), 0.0003, 0.006)
    p[: len(click)] += click
    return p


def tick() -> np.ndarray:
    d = 0.08
    return bp(noise(d), 2500, 7000) * env(int(d * SR), 0.0003, 0.004) + np.sin(2 * np.pi * 1800 * t_axis(d)) * env(int(d * SR), 0.0005, 0.01) * 0.5


def poof() -> np.ndarray:
    d = 0.7
    n = int(d * SR)
    return lp(noise(d), 700) * env(n, 0.01, 0.15) * 1.5 + sparkle(d) * 0.4


def run_steps(dur: float) -> np.ndarray:
    out = np.zeros(int(dur * SR) + SR)
    at, k = 0.0, 0
    while at < dur:
        place(out, footstep(k % 3) * 0.8, at)
        at += BEAT / 2
        k += 1
    return out[: int(dur * SR)]


def skid() -> np.ndarray:
    d = 0.5
    t = t_axis(d)
    f = 2300 - 700 * t / d
    squeak = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 + 0.5 * np.sin(2 * np.pi * 45 * t))
    return (squeak * 0.4 + bp(noise(d), 1500, 6000) * 0.25) * env(len(t), 0.01, 0.3)


def notif() -> np.ndarray:
    out = np.zeros(int(0.9 * SR))
    place(out, bell(1318.5, 0.6), 0.0, 0.7)
    place(out, bell(1760.0, 0.7), 0.12, 0.7)
    return out


def bed_flop() -> np.ndarray:
    out = soft_thump()
    out = np.concatenate([out, np.zeros(int(0.6 * SR))])
    place(out, boing() * 0.45, 0.03)
    return out


def whoosh(d: float = 0.6) -> np.ndarray:
    t = t_axis(d)
    centre = 0.45 * d
    out = np.zeros(len(t))
    for k, f in enumerate([350, 700, 1400, 2800, 5000]):
        band = bp(noise(d), f * 0.7, f * 1.4)
        out += band * np.exp(-(((t - centre + (k - 2) * 0.03) / (0.16 * d + k * 0.01)) ** 2)) * (1 - k * 0.12)
    return out


def record_scratch_from(music: np.ndarray, at: float) -> np.ndarray:
    d = 0.6
    t = t_axis(d)
    mono = music.mean(axis=1) if music.ndim == 2 else music
    seg = mono[max(0, int((at - 0.6) * SR)) : int((at + 0.1) * SR)]
    pos = 0.55 + 0.085 * np.sin(2 * np.pi * 6.5 * t) * (1 - t / d) - 0.25 * (t / d) ** 2
    idx = np.clip(pos * SR, 0, len(seg) - 2)
    i0 = idx.astype(int)
    frac = idx - i0
    y = seg[i0] * (1 - frac) + seg[i0 + 1] * frac
    friction = bp(noise(d), 800, 5000) * 0.2
    return (y * 1.4 + friction * np.abs(np.cos(2 * np.pi * 6.5 * t))) * env(len(t), 0.004, 0.32)


def write_music(name: str, x: np.ndarray, peak_db: float = -2.0) -> None:
    MUSIC.mkdir(parents=True, exist_ok=True)
    data = master(x if x.ndim == 2 else np.stack([x, x], axis=1), peak_db)
    sf.write(MUSIC / f"{name}.wav", data, SR, subtype="PCM_16")
    print(f"  music/{name}.wav  {len(data) / SR:5.2f}s")


def main() -> None:
    _ = rng  # deterministic seed lives in synth.py
    print("Music:")
    ring = ringtone(1)
    write_music("ringtone", ring, -3.0)
    write_music("groove", groove())
    write_music("stinger", stinger(), -2.5)
    pan = panic()
    write_music("panic", pan)
    write_music("lofi", lofi(), -3.0)

    print("SFX:")
    save(SFX, "ringtone_phone", phone_speaker(ringtone(2)))
    save(SFX, "phone_buzz", phone_buzz())
    save(SFX, "bell_clock", bell_ring(1.6, 2300, 17, 0.07))
    save(SFX, "bell_giant", bell_ring(3.2, 720, 11, 0.16) + lp(noise(3.2), 120) * 0.15)
    save(SFX, "slap", slap())
    save(SFX, "soft_thump", soft_thump())
    save(SFX, "huge_thud", huge_thud())
    save(SFX, "thud", thud(False))
    save(SFX, "whoosh", whoosh())
    save(SFX, "rustle", rustle())
    save(SFX, "snore", snore())
    save(SFX, "wing_flap", wing_flap())
    save(SFX, "bubble_inflate", bubble_inflate())
    save(SFX, "bubble_pop", bubble_pop())
    save(SFX, "tick", tick())
    save(SFX, "poof", poof())
    save(SFX, "run_steps", run_steps(2.4))
    save(SFX, "skid", skid())
    save(SFX, "notif", notif())
    save(SFX, "bed_flop", bed_flop())
    save(SFX, "birds", birds(5.0))
    save(SFX, "record_scratch", record_scratch_from(pan, 2 * BAR), -2)


if __name__ == "__main__":
    main()
