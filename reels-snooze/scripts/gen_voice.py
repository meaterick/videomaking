"""Generate Korean voice lines with Supertonic (open-source, on-device TTS).

Reads scripts/dialogue.json and writes:
  public/audio/voice/<id>.wav   one WAV per line
  src/data/voice.json           duration, per-frame mouth envelope (lip sync)
                                and word timings (for karaoke subtitles)

Word timings come from faster-whisper (open-source ASR) run on the generated
audio and aligned back to the script text, so subtitles follow the real speech.
If faster-whisper is not installed, timings are spread by syllable count.

Usage:  python scripts/gen_voice.py            (from the hiker-tumble folder)
"""

from __future__ import annotations

import difflib
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt
from supertonic import TTS

ROOT = Path(__file__).resolve().parent.parent
DIALOGUE = ROOT / "scripts" / "dialogue.json"
OUT_DIR = ROOT / "public" / "audio" / "voice"
DATA_OUT = ROOT / "src" / "data" / "voice.json"

HANGUL = re.compile(r"[가-힣A-Za-z0-9]")


def trim_silence(w: np.ndarray, sr: int, thresh: float = 0.012, pad: float = 0.04) -> np.ndarray:
    hop = int(sr * 0.01)
    env = np.array([np.abs(w[i : i + hop]).max() for i in range(0, len(w), hop)])
    idx = np.where(env > thresh)[0]
    if len(idx) == 0:
        return w
    a = max(0, idx[0] * hop - int(pad * sr))
    b = min(len(w), (idx[-1] + 1) * hop + int(pad * sr))
    return w[a:b]


def vibrato(w: np.ndarray, sr: int, rate: float, depth: float) -> np.ndarray:
    """Pitch wobble via a modulated delay line. depth = relative pitch deviation."""
    n = np.arange(len(w))
    amp = depth * sr / (2 * np.pi * rate)
    pos = n - amp - amp * np.sin(2 * np.pi * rate * n / sr)
    return np.interp(np.clip(pos, 0, len(w) - 1), n, w).astype(np.float32)


def resample(w: np.ndarray, factor: float) -> np.ndarray:
    """factor > 1 raises pitch and shortens the clip."""
    n_out = int(len(w) / factor)
    return np.interp(np.arange(n_out) * factor, np.arange(len(w)), w).astype(np.float32)


def lowpass(w: np.ndarray, sr: int, f: float) -> np.ndarray:
    return sosfilt(butter(4, f, btype="low", fs=sr, output="sos"), w).astype(np.float32)


def apply_fx(w: np.ndarray, sr: int, fx: str | None) -> np.ndarray:
    if fx == "muffled":  # talking into a pillow / from under the blanket
        w = lowpass(w, sr, 850) * 1.6
    elif fx == "sleepy":
        w = lowpass(w, sr, 3200)
        w = resample(w, 0.96)  # a touch lower and slower
    elif fx == "rooster":
        w = resample(w, 1.28)  # high & fast
        w = vibrato(w, sr, rate=11, depth=0.09)
        w = np.tanh(w * 3.0) / np.tanh(3.0)  # raspy
    elif fx == "shout":
        w = resample(w, 1.03)
        w = np.tanh(w * 1.3) / np.tanh(1.3)
    elif fx == "scream":
        w = resample(w, 1.12)
        w = vibrato(w, sr, rate=6.5, depth=0.07)
        t = np.arange(len(w)) / sr
        w = w * (1 + 0.25 * np.sin(2 * np.pi * 9 * t))  # bumpy tremolo
        w = np.tanh(w * 2.2) / np.tanh(2.2)  # a little grit
    elif fx == "shaky":
        w = vibrato(w, sr, rate=8.5, depth=0.035)
        t = np.arange(len(w)) / sr
        w = w * (1 + 0.18 * np.sin(2 * np.pi * 11 * t))
    return w.astype(np.float32)


def normalize(w: np.ndarray, peak_db: float = -1.5) -> np.ndarray:
    peak = np.abs(w).max() or 1.0
    return (w / peak * 10 ** (peak_db / 20)).astype(np.float32)


def mouth_envelope(w: np.ndarray, sr: int, fps: int) -> list[float]:
    hop = sr / fps
    frames = int(np.ceil(len(w) / hop))
    rms = np.array(
        [np.sqrt(np.mean(w[int(i * hop) : int((i + 1) * hop)] ** 2) + 1e-12) for i in range(frames)]
    )
    ref = np.percentile(rms, 95) or 1.0
    env = np.clip(rms / ref, 0, 1) ** 0.7
    env[env < 0.12] = 0
    # light smoothing so the jaw does not chatter
    env = np.convolve(env, [0.25, 0.5, 0.25], mode="same")
    return [round(float(v), 2) for v in env]


def syllables(word: str) -> int:
    return max(1, len(HANGUL.findall(word)))


def spread_by_syllables(words: list[str], dur: float) -> list[tuple[float, float]]:
    weights = [syllables(w) + (0.8 if re.search(r"[….!?,~]$", w) else 0) for w in words]
    total = sum(weights)
    out, t = [], 0.0
    for w, wt in zip(words, weights):
        d = dur * wt / total
        out.append((t, t + d * (0.85 if re.search(r"[….!?,~]$", w) else 1.0)))
        t += d
    return out


def align_with_asr(model, w: np.ndarray, sr: int, words: list[str]) -> tuple[list[tuple[float, float]], str]:
    """Align script words to whisper word timings via syllable-level matching."""
    n16 = int(len(w) * 16000 / sr)
    w16 = np.interp(np.linspace(0, len(w) - 1, n16), np.arange(len(w)), w).astype(np.float32)
    segs, _ = model.transcribe(w16, language="ko", word_timestamps=True, beam_size=5)
    asr_words = [x for s in segs for x in s.words]
    heard = " ".join(x.word.strip() for x in asr_words)
    # per-character timeline of what whisper heard
    a_chars, a_times = [], []
    for x in asr_words:
        cs = HANGUL.findall(x.word)
        for k, c in enumerate(cs):
            a_chars.append(c)
            a_times.append(
                (x.start + (x.end - x.start) * k / len(cs), x.start + (x.end - x.start) * (k + 1) / len(cs))
            )
    s_chars, owner = [], []
    for wi, word in enumerate(words):
        for c in HANGUL.findall(word):
            s_chars.append(c)
            owner.append(wi)
    if not a_chars or not s_chars:
        return spread_by_syllables(words, len(w) / sr), heard
    char_time: list[tuple[float, float] | None] = [None] * len(s_chars)
    sm = difflib.SequenceMatcher(a=s_chars, b=a_chars, autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            char_time[blk.a + k] = a_times[blk.b + k]
    # fill gaps by linear interpolation between known characters
    known = [i for i, v in enumerate(char_time) if v is not None]
    if len(known) < max(2, len(s_chars) // 3):
        return spread_by_syllables(words, len(w) / sr), heard
    dur = len(w) / sr
    for i in range(len(char_time)):
        if char_time[i] is None:
            prev = max([k for k in known if k < i], default=None)
            nxt = min([k for k in known if k > i], default=None)
            t0 = char_time[prev][1] if prev is not None else 0.0
            t1 = char_time[nxt][0] if nxt is not None else dur
            span_prev = prev if prev is not None else -1
            span_next = nxt if nxt is not None else len(char_time)
            f0 = (i - span_prev - 1) / max(1, span_next - span_prev - 1)
            f1 = (i - span_prev) / max(1, span_next - span_prev - 1)
            char_time[i] = (t0 + (t1 - t0) * f0, t0 + (t1 - t0) * f1)
    out = []
    for wi in range(len(words)):
        idx = [i for i, o in enumerate(owner) if o == wi]
        if not idx:
            out.append(out[-1] if out else (0.0, 0.1))
            continue
        out.append((char_time[idx[0]][0], char_time[idx[-1]][1]))
    # enforce monotonic, non-overlapping timings
    fixed, last = [], 0.0
    for a, b in out:
        a = max(a, last)
        b = max(b, a + 0.08)
        fixed.append((a, b))
        last = b
    return fixed, heard


def main() -> None:
    cfg = json.loads(DIALOGUE.read_text(encoding="utf-8"))
    fps = cfg["fps"]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DATA_OUT.parent.mkdir(parents=True, exist_ok=True)

    tts = TTS(auto_download=True)
    sr = tts.sample_rate
    try:
        from faster_whisper import WhisperModel

        asr = WhisperModel("small", device="cpu", compute_type="int8")
    except Exception as e:  # pragma: no cover - optional dependency
        print(f"[gen_voice] faster-whisper unavailable ({e}); using syllable timing", file=sys.stderr)
        asr = None

    styles: dict[str, object] = {}
    result = {"fps": fps, "sampleRate": sr, "lines": {}}
    only = set(sys.argv[1:])  # optional: regenerate just these line ids
    previous = json.loads(DATA_OUT.read_text(encoding="utf-8"))["lines"] if only and DATA_OUT.exists() else {}
    for line in cfg["lines"]:
        if only and line["id"] not in only and line["id"] in previous:
            result["lines"][line["id"]] = previous[line["id"]]
            continue
        spk = cfg["speakers"][line["speaker"]]
        voice = line.get("voice", spk["voice"])
        if voice not in styles:
            styles[voice] = tts.get_voice_style(voice)
        speed = line.get("speed", spk["speed"])
        tts_text = line.get("tts", line["text"]).replace("…", "... ")
        wav, _ = tts.synthesize(tts_text, voice_style=styles[voice], lang="ko", speed=speed, total_steps=16)
        w = np.asarray(wav, dtype=np.float32).ravel()
        w = trim_silence(w, sr)
        w = apply_fx(w, sr, line.get("fx"))
        w = normalize(w, -1.5 if line["speaker"] == "hiker" else -3.0)
        path = OUT_DIR / f"{line['id']}.wav"
        sf.write(path, w, sr, subtype="PCM_16")

        words = line["text"].split()
        if asr is not None:
            timings, heard = align_with_asr(asr, w, sr, words)
        else:
            timings, heard = spread_by_syllables(words, len(w) / sr), ""
        dur = len(w) / sr
        result["lines"][line["id"]] = {
            "duration": round(dur, 3),
            "mouth": mouth_envelope(w, sr, fps),
            "words": [
                {"text": word, "startMs": round(a * 1000), "endMs": round(min(b, dur) * 1000)}
                for word, (a, b) in zip(words, timings)
            ],
        }
        end = line["start"] + dur
        print(f"{line['id']:>3} {voice} {dur:5.2f}s  {line['start']:5.1f}->{end:5.1f}  '{line['text']}'  heard: '{heard}'")

    # overlap check between consecutive lines
    lines = sorted(cfg["lines"], key=lambda l: l["start"])
    for a, b in zip(lines, lines[1:]):
        end = a["start"] + result["lines"][a["id"]]["duration"]
        if end > b["start"] - 0.15:
            print(f"[gen_voice] WARNING: {a['id']} ends at {end:.2f}s, overlapping {b['id']} at {b['start']:.2f}s")

    DATA_OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {DATA_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
