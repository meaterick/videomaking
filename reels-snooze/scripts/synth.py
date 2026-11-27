"""Small synth library (shared helpers from the hiker-tumble project).

Everything here is generated from scratch with numpy/scipy (no samples), so
the soundtrack is original and royalty-free.

Writes public/audio/sfx/*.wav and public/audio/music/*.wav.
Usage:  python scripts/gen_audio.py      (from the hiker-tumble folder)
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
SFX = ROOT / "public" / "audio" / "sfx"
MUSIC = ROOT / "public" / "audio" / "music"
rng = np.random.default_rng(20261125)


# ---------------------------------------------------------------- helpers
def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def noise(dur: float) -> np.ndarray:
    return rng.standard_normal(int(dur * SR))


def bp(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def env(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(0, t - attack) / max(decay, 1e-4))


def sweep(f0: float, f1: float, dur: float, curve: str = "exp") -> np.ndarray:
    t = t_axis(dur)
    if curve == "exp":
        f = f0 * (f1 / f0) ** (t / dur)
    else:
        f = f0 + (f1 - f0) * t / dur
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def place(buf: np.ndarray, x: np.ndarray, at: float, gain: float = 1.0) -> None:
    i = int(at * SR)
    if i >= len(buf):
        return
    n = min(len(x), len(buf) - i)
    buf[i : i + n] += x[:n] * gain


def norm(x: np.ndarray, peak_db: float = -3.0) -> np.ndarray:
    p = np.abs(x).max() or 1.0
    return (x / p * 10 ** (peak_db / 20)).astype(np.float32)


def fade(x: np.ndarray, fin: float = 0.005, fout: float = 0.02) -> np.ndarray:
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def save(folder: Path, name: str, x: np.ndarray, peak_db: float = -3.0) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    data = norm(fade(x), peak_db)
    sf.write(folder / f"{name}.wav", data, SR, subtype="PCM_16")
    print(f"  {folder.name}/{name}.wav  {len(data) / SR:5.2f}s")


def grains(dur: float, count: int, lo: float, hi: float, decay_curve: float = 0.0, spread: float = 1.0) -> np.ndarray:
    """Sparse crackle (dry leaves, gravel)."""
    out = np.zeros(int(dur * SR))
    for _ in range(count):
        at = rng.random() ** (1 + decay_curve) * dur * spread
        g = bp(noise(0.012), lo, hi) * env(int(0.012 * SR), 0.0005, 0.003)
        place(out, g, at, 0.3 + rng.random())
    return out


# ---------------------------------------------------------------- SFX
def footstep(seed_shift: float) -> np.ndarray:
    d = 0.2
    n = int(d * SR)
    thump = np.sin(2 * np.pi * (85 + seed_shift * 10) * t_axis(d)) * env(n, 0.002, 0.03)
    crunch = bp(noise(d), 1200, 5200) * env(n, 0.001, 0.035)
    return thump * 0.8 + crunch * 0.5 + grains(d, 14, 2000, 7000, 2.0) * 0.4


def pole_click() -> np.ndarray:
    d = 0.09
    t = t_axis(d)
    n = len(t)
    return (np.sin(2 * np.pi * 2900 * t) + 0.6 * np.sin(2 * np.pi * 4700 * t)) * env(n, 0.0005, 0.012) + bp(noise(d), 3000, 9000) * env(n, 0.0002, 0.002)


def thud(big: bool) -> np.ndarray:
    d = 0.9 if big else 0.5
    n = int(d * SR)
    body = sweep(120 if big else 160, 40 if big else 65, d) * env(n, 0.002, 0.32 if big else 0.16)
    low = lp(noise(d), 220) * env(n, 0.001, 0.12) * 3
    leaves = bp(noise(d), 1800, 6500) * env(n, 0.001, 0.09) * 0.5
    return body * 1.0 + low * 0.6 + leaves + grains(d, 40 if big else 18, 2000, 7000, 2.5, 0.6) * 0.5


def rumble(d: float) -> np.ndarray:
    n = int(d * SR)
    brown = np.cumsum(rng.standard_normal(n))
    brown = hp(brown, 20)
    brown = lp(brown, 320)
    brown /= np.abs(brown).max()
    t = t_axis(d)
    rate = 8.5 + 1.5 * np.sin(2 * np.pi * 0.23 * t)
    bumps = np.abs(np.sin(np.pi * np.cumsum(rate) / SR)) ** 3
    crackle = grains(d, int(d * 90), 1800, 7000) * 0.35
    rustle = hp(noise(d), 2500) * (0.08 + 0.12 * bumps)
    x = brown * (0.35 + 0.65 * bumps) + crackle + rustle
    x[: int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))
    x[-int(0.3 * SR) :] *= np.linspace(1, 0, int(0.3 * SR))
    return x


def slide_whistle_down() -> np.ndarray:
    d = 0.62
    t = t_axis(d)
    f = 1900 * (450 / 1900) ** (t / d) * (1 + 0.02 * np.sin(2 * np.pi * 6 * t))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    breath = bp(noise(d), 1500, 4000) * 0.05
    return (tone + breath) * env(len(t), 0.03, 0.5)


def bonk() -> np.ndarray:
    d = 0.3
    t = t_axis(d)
    n = len(t)
    return (
        np.sin(2 * np.pi * 820 * t) * env(n, 0.0005, 0.06)
        + 0.6 * np.sin(2 * np.pi * 2050 * t) * env(n, 0.0005, 0.03)
        + 0.3 * np.sin(2 * np.pi * 3300 * t) * env(n, 0.0005, 0.02)
        + bp(noise(d), 1000, 6000) * env(n, 0.0002, 0.004)
    )


def boing() -> np.ndarray:
    d = 0.75
    t = t_axis(d)
    f = 190 * (1 + 0.55 * np.exp(-5 * t) * np.sin(2 * np.pi * 11 * t)) * (1 + 0.6 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.35 * np.sin(2 * ph)) * env(len(t), 0.004, 0.35)


def leaves_burst() -> np.ndarray:
    d = 1.3
    n = int(d * SR)
    poof = lp(noise(d), 400) * env(n, 0.003, 0.08) * 2.5
    crunch = grains(d, 320, 1500, 8000, 1.8)
    rustle = hp(noise(d), 2200) * env(n, 0.01, 0.35) * 0.35
    return poof + crunch + rustle


def rustle(d: float = 0.45) -> np.ndarray:
    n = int(d * SR)
    flutter = np.abs(lp(noise(d), 18)) * 3
    return hp(noise(d), 2600) * flutter * env(n, 0.03, d * 0.5) + grains(d, 30, 2000, 7000) * 0.4


def squeak() -> np.ndarray:
    out = np.zeros(int(0.5 * SR))
    for i, at in enumerate([0.0, 0.12, 0.26]):
        c = sweep(2500 + i * 200, 4300 + i * 150, 0.075) * env(int(0.075 * SR), 0.004, 0.03)
        place(out, c, at)
    return out


def pop() -> np.ndarray:
    d = 0.14
    return sweep(280, 1150, d) * env(int(d * SR), 0.002, 0.05)


def birds(d: float = 14.0) -> np.ndarray:
    out = np.zeros(int(d * SR))
    at = 0.2
    while at < d - 1:
        near = rng.random() < 0.55
        notes = rng.integers(2, 6)
        base = 2400 + rng.random() * 2600
        for k in range(notes):
            dur = 0.04 + rng.random() * 0.07
            f0 = base * (0.85 + rng.random() * 0.3)
            c = sweep(f0, f0 * (1.25 + rng.random() * 0.5), dur)
            c *= env(len(c), 0.005, dur * 0.4) * (1 + 0.5 * np.sin(2 * np.pi * 70 * t_axis(dur)))
            place(out, c, at + k * (dur + 0.03), 1.0 if near else 0.35)
        at += 0.35 + rng.random() * 1.2
    return out


def wind(d: float = 14.0) -> np.ndarray:
    t = t_axis(d)
    w = lp(noise(d), 480) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.12 * t + 1) * np.sin(2 * np.pi * 0.05 * t))
    return w


def tweets(d: float = 3.8) -> np.ndarray:
    out = np.zeros(int(d * SR))
    at = 0.0
    k = 0
    while at < d - 0.2:
        f = 3100 + 400 * (k % 3)
        c = sweep(f, f * 1.35, 0.07) * env(int(0.07 * SR), 0.003, 0.03)
        place(out, c, at, 0.7 + 0.3 * np.sin(k * 1.3))
        at += 0.16 if k % 2 == 0 else 0.3
        k += 1
    circling = 0.55 + 0.45 * np.sin(2 * np.pi * 1.2 * t_axis(d))
    return out * circling


def brass_note(freq: float, dur: float, vib: float = 0.0, wah: bool = True) -> np.ndarray:
    t = t_axis(dur)
    f = freq * (1 + vib * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) / 0.3, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    bright = 0.35 + 0.5 * np.clip(t / 0.12, 0, 1) if wah else np.full_like(t, 0.6)
    x = sum((bright ** (k - 1)) / k * np.sin(k * ph) for k in range(1, 14))
    return x * env(len(t), 0.03, dur * 0.9)


def sad_trombone() -> np.ndarray:
    notes = [(293.66, 0.42), (277.18, 0.42), (261.63, 0.42), (246.94, 1.5)]
    out = np.zeros(int(2.9 * SR))
    at = 0.0
    for i, (f, d) in enumerate(notes):
        place(out, brass_note(f, d, vib=0.025 if i == 3 else 0.0), at)
        at += d - 0.02
    return lp(out, 2600)


def bell(freq: float, dur: float) -> np.ndarray:
    t = t_axis(dur)
    n = len(t)
    return (
        np.sin(2 * np.pi * freq * t) * env(n, 0.002, dur * 0.45)
        + 0.4 * np.sin(2 * np.pi * freq * 2.76 * t) * env(n, 0.001, dur * 0.18)
        + 0.2 * np.sin(2 * np.pi * freq * 5.4 * t) * env(n, 0.001, dur * 0.08)
    )


def jingle() -> np.ndarray:
    out = np.zeros(int(1.6 * SR))
    for i, f in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
        place(out, bell(f, 0.9), i * 0.09, 0.8)
    out += sparkle(1.6) * 0.5
    return out


def sparkle(d: float = 0.7) -> np.ndarray:
    out = np.zeros(int(d * SR))
    for _ in range(26):
        f = 5000 + rng.random() * 4500
        place(out, np.sin(2 * np.pi * f * t_axis(0.06)) * env(int(0.06 * SR), 0.001, 0.015), rng.random() * (d - 0.1), 0.5)
    return out


def crunch() -> np.ndarray:
    return grains(0.25, 60, 1500, 7500, 1.0) + lp(noise(0.25), 500) * env(int(0.25 * SR), 0.001, 0.03)


def whoosh_sfx(d: float = 0.6) -> np.ndarray:
    """Airy whoosh: noise through bands whose gains sweep up and down."""
    t = t_axis(d)
    centre = 0.45 * d
    out = np.zeros(len(t))
    for k, f in enumerate([350, 700, 1400, 2800, 5000]):
        band = bp(noise(d), f * 0.7, f * 1.4)
        peak = centre + (k - 2) * 0.03
        out += band * np.exp(-(((t - peak) / (0.16 * d + k * 0.01)) ** 2)) * (1 - k * 0.12)
    return out


def ding_sfx() -> np.ndarray:
    return bell(1568.0, 1.5) + 0.5 * bell(2349.3, 1.5)


def record_scratch(source: np.ndarray, at: float) -> np.ndarray:
    """DJ-style scratch: scrub the music under the needle back and forth, then stop."""
    d = 0.62
    t = t_axis(d)
    mono = source.mean(axis=1) if source.ndim == 2 else source
    seg = mono[int((at - 0.6) * SR) : int((at + 0.4) * SR)]
    pos = 0.6 + 0.085 * np.sin(2 * np.pi * 6.5 * t) * (1 - t / d) - 0.25 * (t / d) ** 2
    idx = np.clip(pos * SR, 0, len(seg) - 2)
    i0 = idx.astype(int)
    frac = idx - i0
    y = seg[i0] * (1 - frac) + seg[i0 + 1] * frac
    speed = np.abs(np.gradient(pos) * SR)
    friction = bp(noise(d), 800, 5000) * np.clip(speed / 4, 0, 1) * 0.25
    crackle = grains(d, 25, 1500, 6000) * 0.3
    return (y * 1.4 + friction + crackle) * env(len(t), 0.004, 0.35)


# ---------------------------------------------------------------- music
NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name: str) -> float:
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[pitch] + 12 * (octave + 1) - 69) / 12)


_PLUCK_CACHE: dict[tuple[int, int, int, int], np.ndarray] = {}


def pluck(freq: float, dur: float, bright: float = 0.6, decay: float = 0.996) -> np.ndarray:
    """Karplus-Strong plucked string (block-vectorised, cached in 3 variants)."""
    key = (int(freq * 10), int(dur * 1000), int(bright * 10), int(rng.integers(0, 3)))
    if key in _PLUCK_CACHE:
        return _PLUCK_CACHE[key]
    n = int(dur * SR)
    period = max(2, int(round(SR / freq)))
    y = np.zeros(n + period + 2)
    excite = rng.uniform(-1, 1, period)
    y[:period] = lp(excite, 2000 + 6000 * bright, 1) if period > 16 else excite
    i = period
    while i < n:
        j = min(i + period - 1, n)
        y[i:j] = decay * 0.5 * (y[i - period : j - period] + y[i - period + 1 : j - period + 1])
        i = j
    out = y[:n] * env(n, 0.001, dur)
    _PLUCK_CACHE[key] = out
    return out


def strum(names: list[str], dur: float, up: bool = False, gain: float = 1.0) -> np.ndarray:
    out = np.zeros(int((dur + 0.1) * SR))
    order = list(reversed(names)) if up else names
    for k, nm in enumerate(order):
        place(out, pluck(hz(nm), dur, 0.5 if up else 0.7), k * 0.012, (0.6 if up else 1.0) * gain)
    return out


def whistle(freq: float, dur: float) -> np.ndarray:
    t = t_axis(dur)
    f = freq * (1 + 0.006 * np.sin(2 * np.pi * 5.6 * t) * np.clip(t / 0.15, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.08 * np.sin(2 * ph)
    breath = bp(noise(dur), freq * 0.9, min(freq * 1.6, 16000)) * 0.12
    a = np.clip(t / 0.025, 0, 1) * np.clip((dur - t) / 0.06, 0, 1)
    return (tone + breath) * a


def bass_note(freq: float, dur: float) -> np.ndarray:
    t = t_axis(dur)
    ph = 2 * np.pi * freq * t
    x = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    return x * env(len(t), 0.005, dur * 0.6)


def tuba(freq: float, dur: float) -> np.ndarray:
    return lp(brass_note(freq, dur, wah=False), 900) * env(int(dur * SR), 0.01, dur * 0.5)


def marimba(freq: float, dur: float = 0.35) -> np.ndarray:
    t = t_axis(dur)
    n = len(t)
    return (
        np.sin(2 * np.pi * freq * t) * env(n, 0.001, 0.18)
        + 0.25 * np.sin(2 * np.pi * freq * 3.93 * t) * env(n, 0.001, 0.04)
        + 0.08 * np.sin(2 * np.pi * freq * 9.2 * t) * env(n, 0.001, 0.015)
    )


def kick() -> np.ndarray:
    return sweep(140, 45, 0.25) * env(int(0.25 * SR), 0.001, 0.09)


def snare() -> np.ndarray:
    d = 0.2
    n = int(d * SR)
    return bp(noise(d), 1500, 8000) * env(n, 0.001, 0.05) + 0.5 * np.sin(2 * np.pi * 190 * t_axis(d)) * env(n, 0.001, 0.03)


def hat(open_: bool = False) -> np.ndarray:
    d = 0.18 if open_ else 0.05
    return hp(noise(d), 7000) * env(int(d * SR), 0.0005, 0.06 if open_ else 0.012)


def shaker() -> np.ndarray:
    d = 0.08
    return hp(noise(d), 5000) * env(int(d * SR), 0.01, 0.02)


def clap() -> np.ndarray:
    d = 0.2
    out = np.zeros(int(d * SR))
    for k in range(3):
        place(out, bp(noise(0.03), 900, 5000) * env(int(0.03 * SR), 0.0005, 0.006), k * 0.008)
    place(out, bp(noise(0.15), 900, 4000) * env(int(0.15 * SR), 0.001, 0.04), 0.024)
    return out


UKE = {
    "C": ["G4", "C5", "E5", "G5"],
    "Am": ["A4", "C5", "E5", "A5"],
    "F": ["A4", "C5", "F5", "A5"],
    "G": ["G4", "B4", "D5", "G5"],
}
ROOTS = {"C": "C3", "Am": "A2", "F": "F2", "G": "G2"}

HIKE_MELODY = [  # (note or None, beats) — an original whistle tune
    [("E5", 1), ("G5", 1), ("E5", 0.5), ("D5", 0.5), ("C5", 1)],
    [("E5", 1), ("A5", 1), ("G5", 2)],
    [("F5", 1), ("A5", 1), ("G5", 0.5), ("F5", 0.5), ("E5", 1)],
    [("D5", 1), ("B4", 1), ("D5", 2)],
    [("E5", 1), ("G5", 1), ("C6", 1), ("B5", 0.5), ("A5", 0.5)],
    [("G5", 1), ("E5", 1), ("A5", 2)],
    [("F5", 0.5), ("G5", 0.5), ("A5", 1), ("G5", 1), ("F5", 1)],
    [("E5", 1), ("D5", 1), ("G5", 2)],
    [("C6", 2), ("G5", 2)],
    [("A5", 1), ("F5", 1), ("A5", 2)],
    [("G5", 1), ("F5", 1), ("D5", 1), ("B4", 1)],
    [("C5", 4)],
]


def acoustic_theme(chords: list[str], melody: list[list[tuple[str | None, float]]], bpm: float, tail: float, final_hit: bool) -> np.ndarray:
    beat = 60 / bpm
    bar = beat * 4
    dur = len(chords) * bar + tail
    L = np.zeros(int(dur * SR))
    R = np.zeros(int(dur * SR))
    for b, ch in enumerate(chords):
        t0 = b * bar
        last = b == len(chords) - 1
        if last and final_hit:
            s = strum(UKE[ch], 2.5)
            place(L, s, t0, 0.55)
            place(R, s, t0, 0.42)
            place(L, bass_note(hz(ROOTS[ch]), 2.0), t0, 0.5)
            place(R, bass_note(hz(ROOTS[ch]), 2.0), t0, 0.5)
            continue
        # D . D U . U D U
        for pos, up in [(0, False), (2, False), (3, True), (5, True), (6, False), (7, True)]:
            s = strum(UKE[ch], beat * 1.2, up=up)
            place(L, s, t0 + pos * beat / 2, 0.42)
            place(R, s, t0 + pos * beat / 2, 0.3)
        for k in (0, 2):
            bn = bass_note(hz(ROOTS[ch]) * (1 if k == 0 else 1.5), beat * 1.6)
            place(L, bn, t0 + k * beat, 0.45)
            place(R, bn, t0 + k * beat, 0.45)
        for k in range(4):
            place(L, kick(), t0 + k * beat, 0.35 if k % 2 == 0 else 0.0)
            place(R, kick(), t0 + k * beat, 0.35 if k % 2 == 0 else 0.0)
            if k % 2 == 1:
                place(L, clap(), t0 + k * beat, 0.16)
                place(R, clap(), t0 + k * beat, 0.2)
        for k in range(16):
            place(R, shaker(), t0 + k * beat / 4, 0.12 if k % 2 else 0.06)
    # melody
    for b, notes in enumerate(melody):
        if b >= len(chords):
            break
        t = b * bar
        for nm, beats in notes:
            d = beats * beat
            if nm:
                w = whistle(hz(nm), d * 0.95)
                place(L, w, t, 0.22)
                place(R, w, t, 0.3)
            t += d
    stereo = np.stack([L, R], axis=1)
    return stereo


def tumble_theme(dur: float) -> np.ndarray:
    bpm = 168
    beat = 60 / bpm
    bar = beat * 4
    prog = ["Am", "E7", "Am", "E7", "Dm", "Am", "E7", "Am"]
    chord_notes = {"Am": ["A3", "C4", "E4"], "E7": ["G#3", "D4", "E4"], "Dm": ["A3", "D4", "F4"]}
    roots = {"Am": ("A2", "E2"), "E7": ("E2", "B1"), "Dm": ("D2", "A2")}
    L = np.zeros(int((dur + 1) * SR))
    R = np.zeros_like(L)
    bars = int(np.ceil(dur / bar))
    for b in range(bars):
        ch = prog[b % len(prog)]
        t0 = b * bar
        # oom-pah
        for k in range(4):
            if k % 2 == 0:
                place(L, tuba(hz(roots[ch][k // 2]), beat * 1.9), t0 + k * beat, 0.5)
                place(R, tuba(hz(roots[ch][k // 2]), beat * 1.9), t0 + k * beat, 0.5)
                place(L, kick(), t0 + k * beat, 0.4)
                place(R, kick(), t0 + k * beat, 0.4)
            else:
                for nm in chord_notes[ch]:
                    m = marimba(hz(nm) * 2, 0.25)
                    place(L, m, t0 + k * beat, 0.28)
                    place(R, m, t0 + k * beat + 0.004, 0.22)
                place(L, snare(), t0 + k * beat, 0.32)
                place(R, snare(), t0 + k * beat, 0.32)
            for h in range(2):
                place(R, hat(), t0 + k * beat + h * beat / 2, 0.12)
            for h in range(4):
                place(L, shaker(), t0 + k * beat + h * beat / 4, 0.09 if h % 2 else 0.05)
        # every other bar: a falling chromatic marimba run (he's falling!)
        if b % 2 == 1:
            top = hz("A6") if ch != "E7" else hz("G#6")
            for i in range(12):
                f = top / (2 ** (i / 12))
                place(L, marimba(f, 0.18), t0 + i * beat / 4 + 0.002, 0.3)
                place(R, marimba(f, 0.18), t0 + i * beat / 4, 0.3)
        else:
            # bouncy arpeggio
            arp = chord_notes[ch] + [chord_notes[ch][0].replace("3", "4")]
            for i in range(8):
                nm = arp[i % len(arp)]
                f = hz(nm) * 4
                place(L, marimba(f, 0.15), t0 + i * beat / 2, 0.18)
                place(R, marimba(f, 0.15), t0 + i * beat / 2 + 0.003, 0.24)
    # snare roll crescendo in the last bar
    t0 = (bars - 1) * bar
    for i in range(16):
        place(L, snare(), t0 + i * beat / 4, 0.1 + i * 0.015)
        place(R, snare(), t0 + i * beat / 4, 0.1 + i * 0.015)
    out = np.stack([L, R], axis=1)[: int(dur * SR)]
    return out


def master(stereo: np.ndarray, peak_db: float = -2.0) -> np.ndarray:
    x = np.tanh(stereo * 1.2)  # gentle glue
    x = x / (np.abs(x).max() or 1) * 10 ** (peak_db / 20)
    return x.astype(np.float32)
