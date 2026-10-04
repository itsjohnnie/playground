"""Make the showcase video's soundtrack: a bright 150 bpm loop, synthesised.

    python3 tools/music.py out.wav <seconds> <beat seconds>

Kick, clap and hats; a bouncing bass; a soft chord pad; a sparkly arpeggio;
and a whoosh on every cut. The video gives the title 16 beats, each vehicle
8 (two bars) and the ending 12, so the cuts land on the downbeat. Pure Python,
no libraries.
"""
import math
import random
import struct
import sys
import wave

RATE = 22050
rand = random.Random(3)


def main():
    out, total, beat = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    n = int(total * RATE) + RATE
    mix = [0.0] * n

    def add(start, samples, gain):
        i0 = int(start * RATE)
        for i, s in enumerate(samples):
            if 0 <= i0 + i < n:
                mix[i0 + i] += s * gain

    def tone(freq, dur, shape="sine", attack=0.005, decay=None):
        m = int(dur * RATE)
        decay = decay or dur
        out = []
        for i in range(m):
            t = i / RATE
            ph = (freq * t) % 1.0
            if shape == "sine":
                v = math.sin(2 * math.pi * ph)
            elif shape == "tri":
                v = 4 * abs(ph - 0.5) - 1
            else:  # soft square: a few odd harmonics
                v = sum(math.sin(2 * math.pi * ph * k) / k for k in (1, 3, 5)) * 0.8
            env = min(1.0, t / attack) * math.exp(-t / decay * 3)
            out.append(v * env)
        return out

    def noise(dur, decay, hp=True):
        m = int(dur * RATE)
        prev, out = 0.0, []
        for i in range(m):
            x = rand.uniform(-1, 1)
            v = x - prev if hp else x
            prev = x
            out.append(v * math.exp(-i / RATE / decay))
        return out

    kick = []
    for i in range(int(0.2 * RATE)):
        t = i / RATE
        f = 45 + 95 * math.exp(-t * 30)
        kick.append(math.sin(2 * math.pi * f * t) * math.exp(-t * 14))
    clap = noise(0.16, 0.05)
    hat = noise(0.04, 0.012)

    note = lambda k: 440 * 2 ** ((k - 69) / 12)
    # I - V - vi - IV in C: C G Am F
    chords = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
    beats = int(total / beat)
    intro, outro = 16, 12
    end_beat = beats - outro

    for b in range(beats):
        t = b * beat
        bar, pos = divmod(b, 4)
        root, tones = chords[bar % 4]
        build = b < 8                     # the first two bars build up
        ending = b >= end_beat
        # drums
        if not build and not ending:
            add(t, kick, 0.55)
            if pos in (1, 3):
                add(t, clap, 0.22)
        if not ending or b < end_beat + 4:
            add(t + beat / 2, hat, 0.12 if not build else 0.07)
        if 4 <= b < 8:                    # a little fill into the drop
            for k in range(4):
                add(t + k * beat / 4, clap, 0.05 + 0.03 * k * (b - 3))
        # bass: root on the beat, octave on the off-beat
        if not build and not ending:
            add(t, tone(note(root), beat * 0.45, "tri", decay=0.5), 0.32)
            add(t + beat / 2, tone(note(root + 12), beat * 0.4, "tri", decay=0.4), 0.22)
        # pad: one soft chord per bar
        if pos == 0 and not ending:
            for k in tones:
                add(t, tone(note(k), beat * 4, "sine", attack=0.15, decay=6), 0.06)
        # arpeggio in sixteenths once the beat drops
        if b >= intro - 4 and not ending:
            for s in range(4):
                k = tones[(pos * 4 + s) % 3] + 12 * (1 + (s % 2))
                add(t + s * beat / 4, tone(note(k), beat * 0.24, "square", decay=0.12), 0.05)

    # whoosh on each cut: rising filtered noise
    cuts = [intro + 8 * i for i in range((end_beat - intro) // 8 + 1)]
    for c in cuts:
        t = c * beat - 0.35
        sw = noise(0.45, 10, hp=True)
        add(t, [v * math.sin(math.pi * i / len(sw)) ** 2 for i, v in enumerate(sw)], 0.12)

    # the ending: one big ringing chord
    t = end_beat * beat
    add(t, kick, 0.6)
    for k in (36, 48, 60, 64, 67, 72):
        add(t, tone(note(k), outro * beat, "tri" if k < 50 else "sine", attack=0.01, decay=3), 0.09)

    peak = max(abs(v) for v in mix) or 1
    fade_from = int((total - 1.2) * RATE)
    frames = bytearray()
    for i in range(int(total * RATE)):
        v = mix[i] / peak * 0.9
        if i > fade_from:
            v *= max(0.0, 1 - (i - fade_from) / (1.2 * RATE))
        frames += struct.pack("<h", int(v * 32767))
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(frames))
    print(f"music   {out} ({total:.1f}s)")


if __name__ == "__main__":
    main()
