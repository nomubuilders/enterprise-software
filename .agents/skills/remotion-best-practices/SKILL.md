---
name: remotion-best-practices
description: Best practices for Remotion - Video creation in React
metadata:
  tags: remotion, video, react, animation, composition
---

## When to use

Use this skills whenever you are dealing with Remotion code to obtain the domain-specific knowledge.

## Discovery via MCPs

Two MCP servers complement the rule files below. The MCPs answer **"what already exists?"** The rule files answer **"how do I compose it properly?"** Use both.

- **`remotion-bits` MCP** for animation primitives (text effects, scene transitions, particle systems, code blocks, scrolling images, etc). Two-step lookup:
  - `mcp__remotion-bits__find_remotion_bits` to scan the published catalog by query or tags. Returns lightweight summaries (id, exportName, dimensions, tags, components, registry deps).
  - `mcp__remotion-bits__fetch_remotion_bit` on the top one or two matches to retrieve full source code. Adapt examples before composing from raw Remotion primitives.

- **`soundcn` MCP** for UI sound effects (813 sounds, 96 categories, mostly CC0 from Kenney). Tools:
  - `mcp__soundcn__soundcn_list_categories` for the navigable index.
  - `mcp__soundcn__soundcn_search_sounds` to find by intent ("button click", "swoosh", "success") with optional category and `max_duration_sec` filters.
  - `mcp__soundcn__soundcn_get_sound_info` for full metadata plus the install command.
  - `mcp__soundcn__soundcn_preview_sound` to actually hear the sound through system audio (afplay on macOS, paplay on Linux) before locking it in. Critical for not picking sounds blind from names alone.

- **`elevenlabs` MCP** for narration / voiceover (TTS, voice library browsing, voice cloning, speech-to-text). Workflow:
  - **Audition voices** on a representative line before committing. Free pre-made voices that work without paid plan: George `JBFqnCBsd6RMkjVDRZzb` (deep UK male), Rachel `21m00Tcm4TlvDq8ikWAM` (calm US female), Adam `pNInz6obpgDQGcFmaJgB` (deep US male narrator), plus Antoni, Bella, Domi, Josh, Sam. Library voices need a paid subscription, surfaced as HTTP 402 `paid_plan_required` if attempted on free tier.
  - **Generate per-scene MP3s** into `public/voiceover/<comp>/<scene-id>.mp3` so Remotion can resolve them via `staticFile()`.
  - **Wire into compositions** via `<Audio src={staticFile(...)}>` plus `calculateMetadata` to size the composition to the audio durations. See `rules/voiceover.md` for the composition pattern and `rules/calculate-metadata.md` for dynamic duration.
  - **Models**: `eleven_v3` for maximum expressiveness, `eleven_multilingual_v2` for cheaper/faster bulk generation.

These are live registries. Re-query their search/list tools to see fresh data. soundcn additionally exposes `mcp__soundcn__soundcn_refresh_catalog` to update its bundled snapshot.

## New project setup

When in an empty folder or workspace with no existing Remotion project, scaffold one using:

```bash
npx create-video@latest --yes --blank --no-tailwind my-video
```

Replace `my-video` with a suitable project name.

## Starting preview

Stsrt the Remotion Studio to preview a video:

```bash
npx remotion studio
```

## Optional: one-frame render check

You can render a single frame with the CLI to sanity-check layout, colors, or timing.  
Skip it for trivial edits, pure refactors, or when you already have enough confidence from Studio or prior renders.

```bash
npx remotion still [composition-id] --scale=0.25 --frame=30
```

At 30 fps, `--frame=30` is the one-second mark (`--frame` is zero-based).

## Captions

When dealing with captions or subtitles, load the [./rules/subtitles.md](./rules/subtitles.md) file for more information.

## Using FFmpeg

For some video operations, such as trimming videos or detecting silence, FFmpeg should be used. Load the [./rules/ffmpeg.md](./rules/ffmpeg.md) file for more information.

## Silence detection

When needing to detect and trim silent segments from video or audio files, load the [./rules/silence-detection.md](./rules/silence-detection.md) file.

## Audio visualization

When needing to visualize audio (spectrum bars, waveforms, bass-reactive effects), load the [./rules/audio-visualization.md](./rules/audio-visualization.md) file for more information.

## Sound effects

For **discovery and preview**, use the `soundcn` MCP (`mcp__soundcn__soundcn_search_sounds`, `mcp__soundcn__soundcn_preview_sound`) detailed in the Discovery section above. For **composition patterns** (timing relative to frames, layering, fades, integrating with `<Audio>`), load the [./rules/sfx.md](./rules/sfx.md) file.

## Voiceover

For **discovery, audition, and generation**, use the `elevenlabs` MCP detailed in the Discovery section above. For **composition and timing patterns** (loading audio, dynamic composition duration via `calculateMetadata`, scene-by-scene timing alignment), load the [./rules/voiceover.md](./rules/voiceover.md) file. Voiceover MP3s should land in `public/voiceover/<comp>/<scene-id>.mp3` so Remotion can access them via `staticFile()`.

## How to use

Read individual rule files for detailed explanations and code examples:

- [rules/3d.md](rules/3d.md) - 3D content in Remotion using Three.js and React Three Fiber
- [rules/animations.md](rules/animations.md) - Fundamental animation skills for Remotion
- [rules/assets.md](rules/assets.md) - Importing images, videos, audio, and fonts into Remotion
- [rules/audio.md](rules/audio.md) - Using audio and sound in Remotion - importing, trimming, volume, speed, pitch
- [rules/calculate-metadata.md](rules/calculate-metadata.md) - Dynamically set composition duration, dimensions, and props
- [rules/can-decode.md](rules/can-decode.md) - Check if a video can be decoded by the browser using Mediabunny
- [rules/charts.md](rules/charts.md) - Chart and data visualization patterns for Remotion (bar, pie, line, stock charts)
- [rules/compositions.md](rules/compositions.md) - Defining compositions, stills, folders, default props and dynamic metadata
- [rules/extract-frames.md](rules/extract-frames.md) - Extract frames from videos at specific timestamps using Mediabunny
- [rules/fonts.md](rules/fonts.md) - Loading Google Fonts and local fonts in Remotion
- [rules/get-audio-duration.md](rules/get-audio-duration.md) - Getting the duration of an audio file in seconds with Mediabunny
- [rules/get-video-dimensions.md](rules/get-video-dimensions.md) - Getting the width and height of a video file with Mediabunny
- [rules/get-video-duration.md](rules/get-video-duration.md) - Getting the duration of a video file in seconds with Mediabunny
- [rules/gifs.md](rules/gifs.md) - Displaying GIFs synchronized with Remotion's timeline
- [rules/images.md](rules/images.md) - Embedding images in Remotion using the Img component
- [rules/light-leaks.md](rules/light-leaks.md) - Light leak overlay effects using @remotion/light-leaks
- [rules/lottie.md](rules/lottie.md) - Embedding Lottie animations in Remotion
- [rules/measuring-dom-nodes.md](rules/measuring-dom-nodes.md) - Measuring DOM element dimensions in Remotion
- [rules/measuring-text.md](rules/measuring-text.md) - Measuring text dimensions, fitting text to containers, and checking overflow
- [rules/sequencing.md](rules/sequencing.md) - Sequencing patterns for Remotion - delay, trim, limit duration of items
- [rules/tailwind.md](rules/tailwind.md) - Using TailwindCSS in Remotion
- [rules/text-animations.md](rules/text-animations.md) - Typography and text animation patterns for Remotion
- [rules/timing.md](rules/timing.md) - Timing with interpolate and Bézier easing, springs
- [rules/transitions.md](rules/transitions.md) - Scene transition patterns for Remotion
- [rules/transparent-videos.md](rules/transparent-videos.md) - Rendering out a video with transparency
- [rules/trimming.md](rules/trimming.md) - Trimming patterns for Remotion - cut the beginning or end of animations
- [rules/videos.md](rules/videos.md) - Embedding videos in Remotion - trimming, volume, speed, looping, pitch
- [rules/parameters.md](rules/parameters.md) - Make a video parametrizable by adding a Zod schema
- [rules/maps.md](rules/maps.md) - Add a map using Mapbox and animate it
- [rules/silence-detection.md](rules/silence-detection.md) - Adaptive silence detection using FFmpeg loudnorm and silencedetect
- [rules/voiceover.md](rules/voiceover.md) - Adding AI-generated voiceover to Remotion compositions using ElevenLabs TTS
